import dayjs from 'dayjs';
import DOMPurify from "dompurify";
import type { Workspace, WorkspaceSvg } from 'blockly/core';
import { Projects, Project } from "types/projects";
import { uploadNewProject, getCurrentUserData, authCheck, updateProjectData, isSyncedProject, deleteCloudProject, writeToDatabase, getFromDatabase } from '@root/account';
import { workspaceToPng_ } from './screenshot';


export function getProjects(): Projects {
    const projectsRaw = localStorage.getItem("roboxProjects")
    let projects = Object.create(null);

    if (!projectsRaw) {
        localStorage.setItem("roboxProjects", JSON.stringify(projects));
    } else {
        try {
            projects = JSON.parse(projectsRaw, (key, value) => {
                if (isProtoPollution(key)) {
                    console.warn("Skipping forbidden property key in projects data: " + key);
                    return undefined;
                }
    
                return value;
            });
        } catch (error) {
            console.error("Failed to fetch projects: ", error);
        }
    }

    return projects;
}
export async function createProject(name: string): Promise<string> {
    const projects = getProjects()
    const uuid = crypto.randomUUID();

    if (!isValidUUID(uuid)) throw new Error("Invalid project UUID");

    // If user is authenticated, upload the new project to the database
    const isAuthenticated = await authCheck() || false;
    if (isAuthenticated) {
        const currentUser = await getCurrentUserData()
        await uploadNewProject(uuid, currentUser?.id, name)
    }

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

    const cloud = await isSyncedProject(uuid);

    if (cloud) { // If project is synced, try to load from cloud first
        try {
            const raw = await getFromDatabase('projects', uuid, 'project_data'); // Fetch project data from the database
            if (raw) { // if raw data exists
                const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw; // parse the raw data into JSON
                const remoteSnapshot = parsed?.workspace || parsed?.blocks ? (parsed.workspace || parsed) : null; // Check if workspace or blocks exist in the parsed data
                const remoteThumb = parsed?.thumbnail || ''; // Get thumbnail if it exists
                if (remoteSnapshot) { // If remote snapshot exists, load it into the workspace
                    const projects = getProjects(); // get current projects (local cache)
                    if (projects[uuid]) { // If project already exists in local cache, update it
                        projects[uuid].workspace = remoteSnapshot; // Update workspace data
                        if (remoteThumb && !projects[uuid].thumbnail) { // If remote thumbnail exists and local thumbnail is empty, update it
                            projects[uuid].thumbnail = sanitizeImageDataUrl(remoteThumb); // Sanitize and set the thumbnail
                        }
                        localStorage.setItem('roboxProjects', JSON.stringify(projects)); // Save updated projects to local storage
                    }
                    const blockly = await import('blockly/core');
                    blockly.Events.disable(); // Disable Blockly events
                    blockly.serialization.workspaces.load(remoteSnapshot, workspace, { recordUndo: true }); // Load the workspace data into the Blockly workspace
                    blockly.Events.enable(); // Re-enable Blockly events after loading
                    return;
                }
            }
        } catch (e) {
            console.warn('Remote load failed; falling back to local', e); // If remote load fails, fall back to local storage
        }
    }

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

        (async () => {
            if (await isSyncedProject(uuid)) {
                const currentUser = await getCurrentUserData();
                if (currentUser) {
                    try {
                        await updateProjectData(uuid, JSON.stringify({ workspace: data, thumbnail: sanitizeImageDataUrl(thumburi) }));
                    } catch (e) {
                        console.warn('Cloud update failed:', e);
                    }
                }
            }
        })();
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

export async function renameProject(uuid: string, newName: string) {
    if (!isValidUUID(uuid)) throw new Error("Invalid project UUID");

    const projects = getProjects()
    if (!projects[uuid]) throw new Error("Project does not exist")
    projects[uuid]["name"] = newName
    localStorage.setItem("roboxProjects", JSON.stringify(projects))
    if (await isSyncedProject(uuid)) {
        console.log('renaming', uuid);
        const currentUser = await getCurrentUserData();
        if (currentUser) {
            await writeToDatabase('projects', uuid, 'name', newName, true);
        }
    }   
}
export async function deleteProject(uuid: string) {
    console.log('Deleting project:', uuid);
    if (!isValidUUID(uuid)) throw new Error("Invalid project UUID");

    const projects = getProjects()
    if (!projects[uuid]) throw new Error("Project does not exist")
    delete projects[uuid]
    localStorage.setItem("roboxProjects", JSON.stringify(projects))
    if (await isSyncedProject(uuid)) {
        console.log('Project is synced, deleting from cloud as well:', uuid);
        const currentUser = await getCurrentUserData();
        if (currentUser) {
            await deleteCloudProject(uuid);
            console.log('Successfully deleted project', uuid, 'from cloud.');
        }
    }
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
