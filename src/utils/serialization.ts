import type { ProjectType, UserProject } from 'src/types/projects'
import type { ExtensionKey } from 'src/types/extensions'
import extensions from '@/data/extensions.json'
import DOMPurify from 'dompurify'
import dayjs from 'dayjs'
import { getDB, persist, PROJECTS_TABLE } from '@/utils/db'

const ExtensionKeys = Object.keys(extensions) as ExtensionKey[]

/**
 * Fills in fields a stored project predates or is missing.
 *
 * Projects saved before `type`/`code` existed have neither, and an absent
 * `type` is not `'block'` — which is enough to make the block editor treat a
 * perfectly good project as someone else's and refuse to load its blocks. So
 * every read normalises rather than trusting the stored shape, and the first
 * subsequent `editProject` writes the filled-in project back.
 */
function normalizeProject(stored: Record<string, unknown>): UserProject {
    const type: ProjectType =
        stored.type === 'block' || stored.type === 'python'
            ? stored.type
            : // Pre-`type` projects are block projects: the python editor
              // didn't exist yet. `code` is the tie-breaker for anything
              // written by a build in between.
              typeof stored.code === 'string' && !stored.workspace
              ? 'python'
              : 'block'

    const storedExtensions =
        stored.extensions && typeof stored.extensions === 'object'
            ? (stored.extensions as Record<string, unknown>)
            : {}
    const extensions = ExtensionKeys.reduce(
        (acc, key) => {
            acc[key] = storedExtensions[key] === true
            return acc
        },
        {} as Record<ExtensionKey, boolean>,
    )

    return {
        name:
            typeof stored.name === 'string' ? stored.name : 'Untitled Project',
        time:
            typeof stored.time === 'string' || typeof stored.time === 'number'
                ? dayjs(stored.time)
                : dayjs(),
        type,
        workspace:
            stored.workspace && typeof stored.workspace === 'object'
                ? (stored.workspace as Record<string, unknown>)
                : null,
        code:
            typeof stored.code === 'string'
                ? stored.code
                : type === 'python'
                  ? ''
                  : null,
        thumbnail:
            typeof stored.thumbnail === 'string' && stored.thumbnail
                ? stored.thumbnail
                : null,
        extensions,
        sensors:
            stored.sensors &&
            typeof stored.sensors === 'object' &&
            !Array.isArray(stored.sensors)
                ? (stored.sensors as UserProject['sensors'])
                : {},
    }
}

function parseProject(id: string, data: string): UserProject | null {
    try {
        const parsed: unknown = JSON.parse(data)
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
            console.error('Stored project is not an object:', id)
            return null
        }
        return normalizeProject(parsed as Record<string, unknown>)
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
// `type` defaults to 'block' since that's the only editor the UI can create
// or open today — a python editor can pass 'python' once it exists, with no
// further backend changes needed.
export async function createProject(
    type: ProjectType = 'block',
): Promise<string> {
    const db = await getDB()
    const id = crypto.randomUUID()
    await db.run(`INSERT INTO ${PROJECTS_TABLE} (id, data) VALUES (?, ?);`, [
        id,
        JSON.stringify(generateEmptyProject(type)),
    ])
    await persist()
    return id
}
/**
 * Adopts a project parsed out of a `.robox` file, as the original's
 * `importProject` did. The payload is untrusted, so fields are copied across
 * one at a time onto a fresh empty project rather than spread — that keeps
 * unknown keys (and `__proto__`) out, and fills in anything the file omits.
 * Returns the new project's id, or null if the payload isn't a project.
 */
export async function importProject(payload: unknown): Promise<string | null> {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
        return null
    }
    const incoming = payload as Record<string, unknown>
    if (typeof incoming.name !== 'string' || !('workspace' in incoming)) {
        return null
    }

    // Only the block editor's .robox format is importable today.
    const project = generateEmptyProject('block')
    project.name = incoming.name
    project.time = dayjs()
    project.workspace =
        incoming.workspace && typeof incoming.workspace === 'object'
            ? (incoming.workspace as Record<string, unknown>)
            : null
    // Thumbnails are data URLs rendered straight into an <img src>.
    project.thumbnail =
        typeof incoming.thumbnail === 'string' && incoming.thumbnail
            ? sanitizeImageDataUrl(incoming.thumbnail) || null
            : null

    if (incoming.extensions && typeof incoming.extensions === 'object') {
        const extensions = incoming.extensions as Record<string, unknown>
        for (const key of ExtensionKeys) {
            if (typeof extensions[key] === 'boolean') {
                project.extensions[key] = extensions[key]
            }
        }
    }
    if (
        incoming.sensors &&
        typeof incoming.sensors === 'object' &&
        !Array.isArray(incoming.sensors)
    ) {
        project.sensors = incoming.sensors as UserProject['sensors']
    }

    const db = await getDB()
    const id = crypto.randomUUID()
    await db.run(`INSERT INTO ${PROJECTS_TABLE} (id, data) VALUES (?, ?);`, [
        id,
        JSON.stringify(project),
    ])
    await persist()
    return id
}

/** Reads a `.robox` file (JSON) and imports it. Null if it can't be parsed. */
export async function importProjectFile(file: File): Promise<string | null> {
    if (file.type !== 'application/json' && !file.name.endsWith('.robox')) {
        return null
    }
    try {
        return await importProject(JSON.parse(await file.text()))
    } catch (e) {
        console.error('Failed to parse .robox file:', e)
        return null
    }
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
    const res = await db.run(`DELETE FROM ${PROJECTS_TABLE} WHERE id = ?;`, [
        id,
    ])
    await persist()
    return (res.changes?.changes ?? 0) > 0
}

// Normalising an empty object is exactly "an empty project of this type", so
// the defaults live in one place rather than drifting between the two.
function generateEmptyProject(type: ProjectType): UserProject {
    return normalizeProject({ type })
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
export function getProjectIdFromURL(): string | null {
    // If we are running on the server, we cannot access the URL, so we return null
    if (typeof window === 'undefined') return null
    const urlParams = new URLSearchParams(window.location.search)
    const projectId = urlParams.get('id')
    if (projectId && isValidProjectId(projectId)) {
        return projectId
    }
    return null
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
