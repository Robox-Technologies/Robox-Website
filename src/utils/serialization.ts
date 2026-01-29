import type { UserProject } from "src/@types/projects";
import type { ExtensionKey } from "src/@types/extensions";
import extensions from '@data/extensions.json';

import sensors from '@data/sensors.json';
import dayjs from "dayjs";

const ExtensionKeys = Object.keys(extensions) as ExtensionKey[];

export function getProjects(): Record<string, UserProject> {
    const projectsJSON = localStorage.getItem('userProjects');
    if (!projectsJSON) {
        return {};
    }
    try {
        const projects: Record<string, UserProject> = JSON.parse(projectsJSON);
        return projects;
    } catch (e) {
        console.error("Failed to parse user projects from localStorage:", e);
        return {};
    }
}
export function createProject(): string {
    const projects = getProjects()
    const id = crypto.randomUUID();

    projects[id] = generateEmptyProject();
    localStorage.setItem("roboxProjects", JSON.stringify(projects))
    return id
}
export function getProject(id: string): UserProject | null {
    const projects = getProjects();
    return projects[id] || null;
}
export function renameProject(id: string, newName: string): boolean {
    const projects = getProjects();
    if (projects[id]) {
        projects[id].name = newName;
        localStorage.setItem("roboxProjects", JSON.stringify(projects));
        return true;
    }
    return false;
}
export function deleteProject(id: string): boolean {
    const projects = getProjects();
    if (projects[id]) {
        delete projects[id];
        localStorage.setItem("roboxProjects", JSON.stringify(projects));
        return true;
    }
    return false;
}
function generateEmptyProject(): UserProject {
    const userExtensions = ExtensionKeys.reduce((acc, key) => {
        acc[key] = false;
        return acc;
    }, {} as Record<ExtensionKey, boolean>);
    return {
        name: "Untitled Project",
        time: dayjs(),
        workspace: null,
        thumbnail: null,
        extensions: userExtensions,
        sensors: {},
    };
}