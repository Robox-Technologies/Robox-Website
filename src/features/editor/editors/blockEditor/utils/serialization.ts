// This file exists to seperate out the Blockly library (as it does not support tree shaking) from the rest of the codebase
import type { WorkspaceSvg } from 'blockly/core'
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
