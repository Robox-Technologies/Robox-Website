// This file exists to seperate out the Blockly library (as it does not support tree shaking) from the rest of the codebase
import type { Workspace, WorkspaceSvg } from 'blockly/core'
import {
    getProject,
    getProjectIdFromURL,
    isValidProjectId,
    sanitizeImageDataUrl,
    editProject,
} from '@/utils/serialization'
import * as Blockly from 'blockly'
import { workspaceToPng_ } from './screenshot'
import dayjs from 'dayjs'
import type { ExtensionKey } from 'src/types/extensions'
import { pythonGenerator } from 'blockly/python'
import { buildPreamble } from '@/features/editor/utils/preamble'
import { toast } from '@/libs/ui/toast'
import { getExtensionBlockTypes } from './toolbox'
import extensions from '@/data/extensions.json'

const extensionKeys = Object.keys(extensions) as ExtensionKey[]
export async function loadBlockly(workspace: WorkspaceSvg) {
    const projectId = getProjectIdFromURL()
    if (!projectId) return

    const project = await getProject(projectId)
    if (!project) return
    // A stray/bookmarked block-editor URL pointed at a python project
    // shouldn't load (or, worse, overwrite) that project's data.
    if (project.type !== 'block') return
    const workspaceData = project.workspace
    Blockly.Events.disable()

    try {
        if (workspaceData) {
            Blockly.serialization.workspaces.load(workspaceData, workspace, {
                recordUndo: true,
            })
        }
    } finally {
        Blockly.Events.enable()
    }

    if (!workspaceData) {
        saveBlockly(workspace)
    }
}
export async function saveBlockly(workspace: WorkspaceSvg) {
    const projectId = getProjectIdFromURL()
    if (!projectId) return
    workspaceToPng_(
        workspace,
        async (thumburi: string) => {
            if (!isValidProjectId(projectId))
                throw new Error('Invalid project UUID')

            const data = Blockly.serialization.workspaces.save(workspace)
            const project = await getProject(projectId)
            if (!project) throw new Error('Project not found')
            // Mirrors loadBlockly's guard; without it the empty workspace overwrites the project.
            if (project.type !== 'block') return
            project['time'] = dayjs()
            project['workspace'] = data
            project['thumbnail'] = sanitizeImageDataUrl(thumburi)
            await editProject(projectId, project)
        },
        '',
    )
}
export async function generateCode(workspace: WorkspaceSvg) {
    const projectId = getProjectIdFromURL()
    if (!projectId) throw new Error('No project ID found')
    const project = await getProject(projectId)
    if (!project) throw new Error('Project not found')

    const enabledStartBlocks = workspace
        .getBlocksByType('event_begin', false)
        .filter((block) => block.isEnabled())
    if (enabledStartBlocks.length > 1) {
        toast.danger({
            title: 'Cannot run program',
            message: 'Multiple On start blocks are not supported.',
        })
        throw new Error('Multiple enabled On start blocks are not supported')
    }

    const code =
        buildPreamble(project) +
        pythonGenerator.workspaceToCode(workspace) +
        '\nevent_begin()'
    return code
}
export async function setUserExtension(
    extension: ExtensionKey,
    enabled: boolean,
) {
    const projectId = getProjectIdFromURL()
    if (!projectId) throw new Error('No project ID found')
    const project = await getProject(projectId)
    if (!project) throw new Error('Project not found')
    const extensions = project.extensions
    extensions[extension] = enabled
    await editProject(projectId, {
        ...project,
        extensions,
    })
}

// Runs once per project per new extension: a key the project has never stored
// is set from whether the workspace already uses that extension's blocks
// (e.g. list blocks saved before they moved into the Lists extension).
export async function fillUnsetExtensions(workspace: Workspace) {
    const projectId = getProjectIdFromURL()
    if (!projectId) return
    const project = await getProject(projectId)
    if (!project) return

    const unset = extensionKeys.filter(
        (key) => project.extensions[key] === undefined,
    )
    if (unset.length === 0) return

    const usedTypes = new Set(workspace.getAllBlocks(false).map((b) => b.type))
    for (const key of unset) {
        project.extensions[key] = [...getExtensionBlockTypes(key)].some(
            (type) => usedTypes.has(type),
        )
    }
    await editProject(projectId, project)
}
