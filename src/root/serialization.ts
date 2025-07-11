import dayjs from 'dayjs';
import DOMPurify from "dompurify";
import type { Workspace, WorkspaceSvg } from 'blockly/core';
import { Projects, Project } from "types/projects";

import { workspaceToPng_ } from './screenshot';


export function getProjects(): Projects {
    const projectsRaw = localStorage.getItem("roboxProjects")
    let projects = Object.create(null);

    if (!projectsRaw) {
        localStorage.setItem("roboxProjects", JSON.stringify(projects));
    } else {
        projects = JSON.parse(projectsRaw, (key, value) => {
            if (isProtoPollution(key)) {
                console.warn("Invalid UUID in projects data. Skipping...");
                return undefined;
            }

            return value;
        });
    }

    return projects;
}
export function createProject(name: string): string {
    const projects = getProjects()
    const uuid = crypto.randomUUID();

    if (!isValidUUID(uuid)) throw new Error("Invalid project UUID");

    projects[uuid] = { name: name, time: dayjs(), workspace: {}, thumbnail: "" }
    localStorage.setItem("roboxProjects", JSON.stringify(projects))
    return uuid
}
export function getProject(uuid: string, projects: Projects | null = null): Project | null {
    if (!isValidUUID(uuid)) throw new Error("Invalid project UUID");

    if (!projects) {
        projects = getProjects()
    }
    if (Object.keys(projects).length === 0) return null
    if (projects[uuid] === undefined) return null
    return projects[uuid]
}
export async function loadBlockly(uuid: string, workspace: Workspace) {
    if (!isValidUUID(uuid)) throw new Error("Invalid project UUID");

    const blockly = await import('blockly/core');
    const project = getProject(uuid)
    if (!project) return;
    const workspaceData = project.workspace
    if (!workspaceData) return;
    blockly.Events.disable();
    blockly.serialization.workspaces.load(workspaceData, workspace, {recordUndo: true});
    blockly.Events.enable();
}
export function downloadBlocklyProject(uuid: string) {
    if (!isValidUUID(uuid)) throw new Error("Invalid project UUID");

    const project = getProject(uuid)
    if (!project) return
    const workspaceName = project.name
    const downloadEl = document.createElement('a');
    downloadEl.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(JSON.stringify(project)));
    downloadEl.setAttribute('download', workspaceName.split(" ").join("-") + '.robox');

    downloadEl.style.display = 'none';
    document.body.appendChild(downloadEl);
    downloadEl.click();
    document.body.removeChild(downloadEl);
}
export async function saveBlockly(uuid: string, workspace: WorkspaceSvg, callback: ((project: string) => void) | null = null) {
    const blockly = await import('blockly/core');
    workspaceToPng_(workspace, (thumburi: string) => {
        if (!isValidUUID(uuid)) throw new Error("Invalid project UUID");

        const data = blockly.serialization.workspaces.save(workspace)
        const projects = getProjects()
        projects[uuid]["time"] = dayjs()
        projects[uuid]["workspace"] = data
        projects[uuid]["thumbnail"] = sanitizeImageDataUrl(thumburi);
        const projectData = JSON.stringify(projects)
        localStorage.setItem("roboxProjects", projectData)

        if (callback) callback(JSON.stringify(projects[uuid]));
    });
}

export function saveBlocklyCompressed(projectRaw: string) {
    // TODO: SAVEBLOCKLYCOMPRESSED REQUIRES FILE VALIDATION
    const projects = getProjects()
    const project = JSON.parse(projectRaw) as Project
    const uuid = crypto.randomUUID();
    
    if (!isValidUUID(uuid)) throw new Error("Invalid project UUID");

    projects[uuid] = project
    projects[uuid]["time"] = dayjs()
    const projectData = JSON.stringify(projects)
    localStorage.setItem("roboxProjects", projectData)
    return projectData
}

export function renameProject(uuid: string, newName:string) {
    if (!isValidUUID(uuid)) throw new Error("Invalid project UUID");

    const projects = getProjects()
    if (!projects[uuid]) throw new Error("Project does not exist")
    projects[uuid]["name"] = newName
    localStorage.setItem("roboxProjects", JSON.stringify(projects))
}
export function deleteProject(uuid: string) {
    if (!isValidUUID(uuid)) throw new Error("Invalid project UUID");

    const projects = getProjects()
    if (!projects[uuid]) throw new Error("Project does not exist")
    delete projects[uuid]
    localStorage.setItem("roboxProjects", JSON.stringify(projects))
}

export function sanitizeImageDataUrl(dataUrl: string): string {
    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

    // Get MIME type from URL and ensure it is allowed
    const mimeTypeMatch = dataUrl.match(/^data:([^;]+);/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : null;

    if (!mimeType || !allowedMimeTypes.includes(mimeType.toLowerCase())) {
        console.error(`Image data URL has invalid MIME type: ${mimeType}`);
        return "";
    }

    // Return a sanitized URL
    return DOMPurify.sanitize(dataUrl);
}

// Validates project UUID to prevent XSS
function isProtoPollution(key: string): boolean {
    const forbiddenKeys = ["__proto__", "constructor", "prototype"];
    return forbiddenKeys.includes(key);
}

function isValidUUID(uuid: string): boolean {
    if (isProtoPollution(uuid)) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}
