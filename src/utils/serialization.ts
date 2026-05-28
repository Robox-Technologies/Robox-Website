import type { UserProject } from 'src/types/projects'
import type { ExtensionKey } from 'src/types/extensions'
import extensions from '@data/extensions.json'
import DOMPurify from 'dompurify'
import dayjs from 'dayjs'

const ExtensionKeys = Object.keys(extensions) as ExtensionKey[]

export function getProjects(): Record<string, UserProject> {
    if (typeof window === 'undefined') return {}
    const projectsJSON = localStorage.getItem('roboxProjects')
    if (!projectsJSON) {
        return {}
    }
    try {
        const projects: Record<string, UserProject> = JSON.parse(projectsJSON)

        const sortedProjects = Object.fromEntries(
            Object.entries(projects).sort(([, a], [, b]) => dayjs(b.time).diff(dayjs(a.time)))
        );

        return sortedProjects
    } catch (e) {
        console.error('Failed to parse user projects from localStorage:', e)
        return {}
    }
}
export function createProject(): string {
    const projects = getProjects()
    const id = crypto.randomUUID()

    projects[id] = generateEmptyProject()
    localStorage.setItem('roboxProjects', JSON.stringify(projects))
    return id
}
export function getProject(id: string): UserProject | null {
    const projects = getProjects()
    return projects[id] || null
}
export function renameProject(id: string, newName: string): boolean {
    const projects = getProjects()
    if (projects[id]) {
        projects[id].name = newName
        localStorage.setItem('roboxProjects', JSON.stringify(projects))
        return true
    }
    return false
}
export function deleteProject(id: string): boolean {
    const projects = getProjects()
    if (projects[id]) {
        delete projects[id]
        localStorage.setItem('roboxProjects', JSON.stringify(projects))
        return true
    }
    return false
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
export function editProject(id: string, data: Partial<UserProject>): boolean {
    const projects = getProjects()
    if (projects[id]) {
        projects[id] = {
            ...projects[id],
            ...data,
        }
        localStorage.setItem('roboxProjects', JSON.stringify(projects))
        return true
    }
    return false
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
