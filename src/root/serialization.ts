import dayjs from 'dayjs';
import type { Workspace, WorkspaceSvg } from 'blockly/core';
import { Projects, Project } from "types/projects";

import { workspaceToSvg_ } from './screenshot';


export function getProjects(): Projects {
    let projectsRaw = localStorage.getItem("roboxProjects")
    let projects = {}
    if (!projectsRaw) {
        localStorage.setItem("roboxProjects", "{}")
        projects = {}
    }
    else projects = JSON.parse(projectsRaw)
    return projects
}
export function createProject(name: string) {
    let projects = getProjects()
    let uuid = crypto.randomUUID();
    projects[uuid] = { name: name, time: dayjs(), workspace: {}, thumbnail: "" }
    localStorage.setItem("roboxProjects", JSON.stringify(projects))
    return uuid
}
export function getProject(uuid: string, projects: Projects | null = null): Project | null {
    if (!projects) {
        projects = getProjects()
    }
    if (Object.keys(projects).length === 0) return null
    if (projects[uuid] === undefined) return null
    return projects[uuid]
}
export async function loadBlockly(uuid: string, workspace: Workspace) {
    const blockly = await import('blockly/core');
    let project = getProject(uuid)
    if (!project) return;
    let workspaceData = project.workspace
    if (!workspaceData) return;
    blockly.Events.disable();
    blockly.serialization.workspaces.load(workspaceData, workspace, {recordUndo: true});
    blockly.Events.enable();
}
export function downloadBlocklyProject(uuid: string) {
    let project = getProject(uuid)
    if (!project) return
    let workspaceName = project.name
    let downloadEl = document.createElement('a');
    downloadEl.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(project)));
    downloadEl.setAttribute('download', workspaceName.split(" ").join("-") + '.robox');

    downloadEl.style.display = 'none';
    document.body.appendChild(downloadEl);
    downloadEl.click();
    document.body.removeChild(downloadEl);
}
export async function saveBlockly(uuid: string, workspace: WorkspaceSvg, callback: ((project: string) => void) | null = null) {
    
    const blockly = await import('blockly/core');
    workspaceToSvg_(workspace, (thumburi: string) => {
        const data = blockly.serialization.workspaces.save(workspace)
        let projects = getProjects()
        projects[uuid]["time"] = dayjs()
        projects[uuid]["workspace"] = data
        projects[uuid]["thumbnail"] = thumburi
        let projectData = JSON.stringify(projects)
        localStorage.setItem("roboxProjects", projectData)

        if (callback) callback(JSON.stringify(projects[uuid]));
    });
}

export function saveBlocklyCompressed(projectRaw: string) {
    // TODO: SAVEBLOCKLYCOMPRESSED REQUIRES FILE VALIDATION
    let projects = getProjects()
    let project = JSON.parse(projectRaw) as Project
    let uuid = crypto.randomUUID();
    projects[uuid] = project
    projects[uuid]["time"] = dayjs()
    let projectData = JSON.stringify(projects)
    localStorage.setItem("roboxProjects", projectData)
    return projectData
}

export function renameProject(uuid: string, newName:string) {
    let projects = getProjects()
    if (!projects[uuid]) throw new Error("Project does not exist")
    projects[uuid]["name"] = newName
    localStorage.setItem("roboxProjects", JSON.stringify(projects))
}
export function deleteProject(uuid: string) {
    let projects = getProjects()
    if (!projects[uuid]) throw new Error("Project does not exist")
    delete projects[uuid]
    localStorage.setItem("roboxProjects", JSON.stringify(projects))
}

