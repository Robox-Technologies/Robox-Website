// This file exists to seperate out the Blockly library (as it does not support tree shaking) from the rest of the codebase
import { Workspace, WorkspaceSvg } from "blockly/core";
import { id } from "@stores/editor";
import { getProject, getProjects, isValidProjectId, isProtoPollution, sanitizeImageDataUrl, editProject } from "@utils/serialization";
import * as Blockly from "blockly";
import { workspaceToPng_ } from "./screenshot";
import dayjs from "dayjs";
import type { ExtensionKey } from "src/types/extensions";
import type { PinsOf, SensorKey } from "src/types/extraSensors";
import type { UserExtensions, UserSensor, UserSensors } from "src/types/projects";
import { pythonGenerator } from "blockly/python";
import { preamble, ExtensionsPreamble, ExtraSensorsPreamble } from "../config/preamble";


export async function loadBlockly(workspace: Workspace) {
    const projectId = id.get();
    if (!projectId) return;

    const project = getProject(projectId)
    if (!project) return;
    const workspaceData = project.workspace
    if (!workspaceData) return;
    Blockly.Events.disable();
    Blockly.serialization.workspaces.load(workspaceData, workspace, {recordUndo: true});
    Blockly.Events.enable();
}
export async function saveBlockly(workspace: WorkspaceSvg) {
    const projectId = id.get();
    if (!projectId) return;
    workspaceToPng_(workspace, (thumburi: string) => {
        if (!isValidProjectId(projectId)) throw new Error("Invalid project UUID");

        const data = Blockly.serialization.workspaces.save(workspace)
        const project = getProject(projectId);
        if (!project) throw new Error("Project not found");
        project["time"] = dayjs()
        project["workspace"] = data
        project["thumbnail"] = sanitizeImageDataUrl(thumburi);
        editProject(projectId, project);
    });
}
export function generateCode(workspace: Workspace) {
    const $projectId = id.get();
    if (!$projectId) throw new Error("No project ID found");
    const project = getProject($projectId);
    if (!project) throw new Error("Project not found");
    const extensionsPreamble = generateExtensionsPreamble(project.extensions);
    const extraSensorsPreamble = generateExtraSensorsPreamble(project.sensors);

    const code = preamble + extensionsPreamble + extraSensorsPreamble + pythonGenerator.workspaceToCode(workspace) + "\nevent_begin()"

    return code;
}
function generateExtensionsPreamble(userExtensions: UserExtensions): string {
    return Object.values(userExtensions)
        .filter(ext => ext === true)
        .map((ext, index) => {
            const extKey = Object.keys(userExtensions)[index] as ExtensionKey;
            return ExtensionsPreamble[extKey];
        })
        .join("\n");
}
function generateExtraSensorsPreamble(userExtraSensors: UserSensors): string {
    return Object.values(userExtraSensors)
        .map(sensor => callSensorPreamble(sensor))
        .join("\n");
}
// So we preserver the typing of the sensor keys in the preamble generation
function callSensorPreamble<K extends SensorKey>(sensor: UserSensor<K>): string {
    return ExtraSensorsPreamble[sensor.type](sensor.pins);
}