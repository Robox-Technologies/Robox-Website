import { describe, it, expect, vi, beforeEach } from 'vitest'
import * as Blockly from 'blockly/core'
import * as En from 'blockly/msg/en'
import 'blockly/blocks'
import type { UserProject } from 'src/types/projects'

const stored: { project: Partial<UserProject> } = { project: {} }
const editProject = vi.fn(async (_id: string, project: UserProject) => {
    stored.project = project
})
vi.mock('@/utils/serialization', () => ({
    getProjectIdFromURL: () => 'project-id',
    getProject: async () => structuredClone(stored.project),
    editProject: (id: string, project: UserProject) => editProject(id, project),
    isValidProjectId: () => true,
    sanitizeImageDataUrl: (url: string) => url,
}))

const { fillUnsetExtensions } =
    await import('@/features/editor/editors/blockEditor/utils/serialization')

// @ts-expect-error the locale module's type doesn't match setLocale's
Blockly.setLocale(En)

const workspaceWith = (...types: string[]) => {
    const workspace = new Blockly.Workspace()
    for (const type of types) workspace.newBlock(type)
    return workspace
}

describe('fillUnsetExtensions', () => {
    beforeEach(() => editProject.mockClear())

    it('sets unset extensions from whether their blocks are used', async () => {
        stored.project = { extensions: {} }
        await fillUnsetExtensions(workspaceWith('lists_split'))
        expect(stored.project.extensions).toEqual({
            SERVO: false,
            LISTS: true,
        })
        expect(editProject).toHaveBeenCalledTimes(1)
    })

    it('counts blocks the extension adds to other categories', async () => {
        stored.project = { extensions: { SERVO: false } }
        await fillUnsetExtensions(workspaceWith('controls_forEach'))
        expect(stored.project.extensions?.LISTS).toBe(true)
    })

    it('does nothing once every extension is set', async () => {
        stored.project = { extensions: { SERVO: false, LISTS: false } }
        await fillUnsetExtensions(workspaceWith('lists_split'))
        expect(editProject).not.toHaveBeenCalled()
    })

    it('only runs the first time a project is opened', async () => {
        stored.project = { extensions: {} }
        await fillUnsetExtensions(workspaceWith('text'))
        await fillUnsetExtensions(workspaceWith('text'))
        expect(editProject).toHaveBeenCalledTimes(1)
    })
})
