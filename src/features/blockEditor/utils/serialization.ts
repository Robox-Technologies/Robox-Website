// This file exists to seperate out the Blockly library (as it does not support tree shaking) from the rest of the codebase
import type { WorkspaceSvg } from 'blockly/core'
import {
    getProject,
    isValidProjectId,
    sanitizeImageDataUrl,
    editProject,
} from '@/utils/serialization'
import * as Blockly from 'blockly'
import { workspaceToPng_ } from './screenshot'
import dayjs from 'dayjs'
import type { ExtensionKey } from 'src/types/extensions'
import type { SensorKey } from 'src/types/extraSensors'
import type {
    UserExtensions,
    UserSensor,
    UserSensors,
} from 'src/types/projects'
import { pythonGenerator } from 'blockly/python'
import {
    preamble,
    ExtensionsPreamble,
    ExtraSensorsPreamble,
} from '../config/preamble'
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
export async function loadBlockly(workspace: WorkspaceSvg) {

    const projectId = getProjectIdFromURL()
    if (!projectId) return

    const project = getProject(projectId)
    if (!project) return
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
        (thumburi: string) => {
            if (!isValidProjectId(projectId))
                throw new Error('Invalid project UUID')

            const data = Blockly.serialization.workspaces.save(workspace)
            const project = getProject(projectId)
            if (!project) throw new Error('Project not found')
            project['time'] = dayjs()
            project['workspace'] = data
            project['thumbnail'] = sanitizeImageDataUrl(thumburi)
            editProject(projectId, project)
        },
        '',
    )
}
export function generateCode(workspace: WorkspaceSvg) {
    const projectId = getProjectIdFromURL()
    if (!projectId) throw new Error('No project ID found')
    const project = getProject(projectId)
    if (!project) throw new Error('Project not found')
    const extensionsPreamble = generateExtensionsPreamble(
        project.extensions ?? {},
    )
    const extraSensorsPreamble = generateExtraSensorsPreamble(
        project.sensors ?? {},
    )

    const code =
        preamble +
        extensionsPreamble +
        extraSensorsPreamble +
        pythonGenerator.workspaceToCode(workspace) +
        '\nevent_begin()'

    return code
}
function generateExtensionsPreamble(userExtensions: UserExtensions): string {
    return Object.values(userExtensions)
        .filter((ext) => ext === true)
        .map((ext, index) => {
            const extKey = Object.keys(userExtensions)[index] as ExtensionKey
            return ExtensionsPreamble[extKey]
        })
        .join('\n')
}
function generateExtraSensorsPreamble(userExtraSensors: UserSensors): string {
    return Object.values(userExtraSensors)
        .map((sensor) => callSensorPreamble(sensor))
        .join('\n')
}
// So we preserver the typing of the sensor keys in the preamble generation
function callSensorPreamble<K extends SensorKey>(
    sensor: UserSensor<K>,
): string {
    return ExtraSensorsPreamble[sensor.type](sensor.pins)
}
export function setUserExtension(extension: ExtensionKey, enabled: boolean) {
    const projectId = getProjectIdFromURL()
    if (!projectId) throw new Error('No project ID found')
    const project = getProject(projectId)
    if (!project) throw new Error('Project not found')
    const extensions = project.extensions
    extensions[extension] = enabled
    editProject(projectId, {
        ...project,
        extensions,
    })
}
