import type { UserProject } from 'src/types/projects'
import type { ExtensionKey } from 'src/types/extensions'
import extensions from '@/data/extensions.json'
import DOMPurify from 'dompurify'
import dayjs from 'dayjs'
import { getDB, persist, PROJECTS_TABLE } from '@/utils/db'

const ExtensionKeys = Object.keys(extensions) as ExtensionKey[]

function parseProject(id: string, data: string): UserProject | null {
    try {
        return JSON.parse(data) as UserProject
    } catch (e) {
        console.error('Failed to parse stored project:', id, e)
        return null
    }
}

export async function getProjects(): Promise<Record<string, UserProject>> {
    if (typeof window === 'undefined') return {}
    const db = await getDB()
    const res = await db.query(`SELECT id, data FROM ${PROJECTS_TABLE};`)
    const projects: Record<string, UserProject> = {}
    for (const row of res.values ?? []) {
        const project = parseProject(row.id, row.data)
        if (project) projects[row.id] = project
    }

    // Most recently edited first.
    return Object.fromEntries(
        Object.entries(projects).sort(([, a], [, b]) =>
            dayjs(b.time).diff(dayjs(a.time)),
        ),
    )
}
export async function createProject(): Promise<string> {
    const db = await getDB()
    const id = crypto.randomUUID()
    await db.run(`INSERT INTO ${PROJECTS_TABLE} (id, data) VALUES (?, ?);`, [
        id,
        JSON.stringify(generateEmptyProject()),
    ])
    await persist()
    return id
}
export async function getProject(id: string): Promise<UserProject | null> {
    if (typeof window === 'undefined') return null
    const db = await getDB()
    const res = await db.query(
        `SELECT id, data FROM ${PROJECTS_TABLE} WHERE id = ?;`,
        [id],
    )
    const row = res.values?.[0]
    return row ? parseProject(row.id, row.data) : null
}
export async function renameProject(
    id: string,
    newName: string,
): Promise<boolean> {
    return editProject(id, { name: newName })
}
export async function deleteProject(id: string): Promise<boolean> {
    const db = await getDB()
    const res = await db.run(`DELETE FROM ${PROJECTS_TABLE} WHERE id = ?;`, [id])
    await persist()
    return (res.changes?.changes ?? 0) > 0
}

function generateEmptyProject(): UserProject {
    const userExtensions = ExtensionKeys.reduce(
        (acc, key) => {
            acc[key] = false
            return acc
        },
        {} as Record<ExtensionKey, boolean>,
    )
    return {
        name: 'Untitled Project',
        time: dayjs(),
        workspace: null,
        thumbnail: null,
        extensions: userExtensions,
        sensors: {},
    }
}
export async function editProject(
    id: string,
    data: Partial<UserProject>,
): Promise<boolean> {
    const existing = await getProject(id)
    if (!existing) return false
    const updated = { ...existing, ...data }
    const db = await getDB()
    await db.run(`UPDATE ${PROJECTS_TABLE} SET data = ? WHERE id = ?;`, [
        JSON.stringify(updated),
        id,
    ])
    await persist()
    return true
}
export function isProtoPollution(key: string): boolean {
    const forbiddenKeys = ['__proto__', 'constructor', 'prototype']
    return forbiddenKeys.includes(key)
}

export function isValidProjectId(id: string): boolean {
    if (isProtoPollution(id)) return false
    const uuidRegex =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidRegex.test(id)
}
export function sanitizeImageDataUrl(dataUrl: string): string {
    const allowedMimeTypes = [
        'image/jpeg',
        'image/png',
        'image/gif',
        'image/webp',
    ]

    // Get MIME type from URL and ensure it is allowed
    const mimeTypeMatch = dataUrl.match(/^data:([^;]+);/)
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : null

    if (!mimeType || !allowedMimeTypes.includes(mimeType.toLowerCase())) {
        console.error(`Image data URL has invalid MIME type: ${mimeType}`)
        return ''
    }

    return DOMPurify.sanitize(dataUrl)
}
