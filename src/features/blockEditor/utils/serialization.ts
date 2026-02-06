// This file exists to seperate out the Blockly library (as it does not support tree shaking) from the rest of the codebase
import { Workspace, WorkspaceSvg } from "blockly/core";
import { projectId } from "@stores/project";
import { getProject, getProjects, isValidProjectId, isProtoPollution, sanitizeImageDataUrl, editProject } from "@utils/serialization";
import * as Blockly from "blockly";
import { workspaceToPng_ } from "./screenshot";
import dayjs from "dayjs";
export async function loadBlockly(workspace: Workspace) {
    const id = projectId.get();
    if (!id) return;

    const project = getProject(id)
    if (!project) return;
    const workspaceData = project.workspace
    if (!workspaceData) return;
    Blockly.Events.disable();
    Blockly.serialization.workspaces.load(workspaceData, workspace, {recordUndo: true});
    Blockly.Events.enable();
}
export async function saveBlockly(workspace: WorkspaceSvg) {
    const id = projectId.get();
    if (!id) return;
    workspaceToPng_(workspace, (thumburi: string) => {
        if (!isValidProjectId(id)) throw new Error("Invalid project UUID");

        const data = Blockly.serialization.workspaces.save(workspace)
        const project = getProject(id);
        if (!project) throw new Error("Project not found");
        project["time"] = dayjs()
        project["workspace"] = data
        project["thumbnail"] = sanitizeImageDataUrl(thumburi);
        editProject(id, project);
    });
}