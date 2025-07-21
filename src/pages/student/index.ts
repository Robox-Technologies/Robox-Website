import {
    createProject,
    getProject,
    getProjects,
    importProject,
    renameProject,
    sanitizeImageDataUrl
} from "../../root/serialization";
import { Project } from "types/projects";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime.js";
import { toggleToolbar, moveToolbar } from "../../root/toolbar";

dayjs.extend(relativeTime);

async function applyProjects() {
    const projectCards = document.querySelectorAll(".project-card");
    projectCards.forEach((card) => {
        card.remove();
    });

    const projectContainer = document.getElementById("project-holder");
    const projectTemplate = document.getElementById("projectCardTemplate") as HTMLTemplateElement;
    const toolbarModal = document.getElementById("project-toolbar") as HTMLDialogElement;
    if (!projectContainer || !projectTemplate || !toolbarModal) return;

    const projects = getProjects();
    const projectIds = Object.keys(projects);
    const sortedByTime = projectIds.sort((a, b) =>
        dayjs(projects[b].time).diff(dayjs(projects[a].time))
    );
    for (const uuid of sortedByTime) {
        const project = projects[uuid];
        const card = createProjectCard(uuid, project);
        card.addEventListener("click", (event: MouseEvent) => {
            const item = event.target as HTMLElement | null;
            if (!item) return;
            window.location.href = `/editor?id=${uuid}`;
            event.stopPropagation();
        });
        const options = card.querySelector(".options") as HTMLButtonElement | null;
        if (!options) continue;
        options.addEventListener("click", (event: MouseEvent) => {
            event.stopImmediatePropagation();
            moveToolbar(toolbarModal, options, [10, 20]);
            toggleToolbar(toolbarModal, true);
        });
        projectContainer.appendChild(card);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    applyProjects();

    const createProjectButton = document.getElementById("create-project");
    createProjectButton?.addEventListener("click", () => {
        const uuid = createProject("unnamed project");
        window.location.href = `/editor?id=${uuid}`;
    });

    const toolbarModal = document.getElementById("project-toolbar") as HTMLDialogElement | null;
    const toolbarEditButton = document.getElementById("project-edit") as HTMLButtonElement | null;
    const toolbarDeleteButton = document.getElementById("project-delete") as HTMLButtonElement | null;
    if (!toolbarModal || !toolbarEditButton || !toolbarDeleteButton) return;

    const editModal = document.getElementById("edit-modal") as HTMLDialogElement | null;
    const deleteModal = document.getElementById("delete-modal") as HTMLDialogElement | null;
    if (!editModal || !deleteModal) return;

    const projectNameInput = editModal.querySelector("input#project-name") as HTMLInputElement | null;
    if (!projectNameInput) return;

    toolbarEditButton.addEventListener("click", () => {
        const projectCard = document.querySelector(".toolbar-target")?.closest(".project-card") as HTMLElement | null;
        if (!projectCard) return;
        const projectId = projectCard.id;
        if (!projectId) return;
        projectNameInput.value = getProject(projectId)?.name || "";
        editModal.showModal();
    });

    toolbarDeleteButton.addEventListener("click", () => {
        deleteModal.showModal();
    });

    const deleteConfirmButton = deleteModal.querySelector("button#delete-confirm-button") as HTMLButtonElement | null;
    const editConfirmButton = editModal.querySelector("button#edit-confirm-button") as HTMLButtonElement | null;
    if (!deleteConfirmButton || !editConfirmButton) return;

    editConfirmButton.addEventListener("click", () => {
        let projectCard = document.querySelector(".toolbar-target")?.closest(".project-card") as HTMLElement | null;
        if (!projectCard) return;
        const projectId = projectCard.id;
        if (!projectId) return;
        const project = getProject(projectId);
        if (!project) return;
        renameProject(projectId, projectNameInput.value);
        applyProjects();
        projectCard = document.getElementById(projectId) as HTMLElement | null;
        if (projectCard) {
            moveToolbar(toolbarModal, projectCard.querySelector(".options") as HTMLElement);
        }
        editModal.close();
    });

    deleteConfirmButton.addEventListener("click", () => {
        const projectCard = document.querySelector(".toolbar-target")?.closest(".project-card") as HTMLElement | null;
        if (!projectCard) return;
        const projectId = projectCard.id;
        if (!projectId) return;
        const projects = getProjects();
        if (projects[projectId]) {
            delete projects[projectId];
            localStorage.setItem("roboxProjects", JSON.stringify(projects));
            applyProjects();
            toggleToolbar(toolbarModal, false);
        }
        deleteModal.close();
    });

    // DROPZONE STUFF
    const dropzone = document.getElementById("dropzone");
    const toggleDropzoneButton = document.getElementById("toggle-dropzone");
    if (!dropzone || !toggleDropzoneButton) return;
    toggleDropzoneButton.addEventListener("click", () => {
        //Open file dialog
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".robox,application/json";
        input.style.display = "none";
        input.addEventListener("change", async (event) => {
            const files = (event.target as HTMLInputElement).files;
            if (!files || files.length === 0) return;
            const file = files[0];
            if (file.type !== "application/json" && !file.name.endsWith(".robox")) return;
            const project = await readROBOXFile(file);
            if (!project) {
                console.error("Failed to read or parse the ROBOT file.");
                return;
            }
            importProject(project);
            applyProjects();
        }
        );
        document.body.appendChild(input);
        input.click();
        document.body.removeChild(input);
        toggleDropzone(false);
    });
    dropzone.addEventListener("drop", handleFileDrop);

    document.addEventListener("dragover", (e) => {
        e.preventDefault();
    });

    document.addEventListener("dragenter", function (e) {
        e.preventDefault();
        if (e.dataTransfer?.types?.includes("Files")) {
            toggleDropzone(true);
        }
    });

    document.addEventListener("dragleave", function (e) {
        e.preventDefault();
        // Only hide if mouse leaves the window
        if (e.relatedTarget === null) {
            toggleDropzone(false);
        }
    });

    document.addEventListener("drop", (e) => {
        e.preventDefault();
        toggleDropzone(false);
    });
});

function createProjectCard(uuid: string, project: Project): HTMLElement {
    const projectTemplate = document.getElementById("projectCardTemplate") as HTMLTemplateElement;
    if (!projectTemplate) return document.createElement("div");

    const fragment = projectTemplate.content.cloneNode(true) as DocumentFragment;
    const clone = fragment.querySelector(".card") as HTMLElement;
    if (!clone) return document.createElement("div");

    const title = clone.querySelector(".card-title-text");
    const time = clone.querySelector(".card-description");
    const image = clone.querySelector(".card-image") as HTMLImageElement | null;
    const options = clone.querySelector(".options") as HTMLButtonElement | null;
    if (!title || !time || !image || !options) return document.createElement("div");

    const projectTime = dayjs(project.time);

    image.src = sanitizeImageDataUrl(project.thumbnail);
    title.textContent = project.name;
    time.textContent = projectTime.fromNow();
    clone.id = uuid;

    return clone;
}

async function handleFileDrop(event: DragEvent) {
    event.preventDefault();
    const files = event.dataTransfer?.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    if (file.type !== "application/json" && !file.name.endsWith(".robox")) return;
    const project = await readROBOXFile(file);
    if (!project) {
        console.error("Failed to read or parse the ROBOX file.");
        return;
    }
    importProject(project);
    applyProjects();
    toggleDropzone(false);
}

function toggleDropzone(show?: boolean) {
    const dropzone = document.getElementById("dropzone");
    if (!dropzone) return;
    if (show === undefined) {
        dropzone.style.display = dropzone.style.display === "none" ? "flex" : "none";
    } else {
        dropzone.style.display = show ? "flex" : "none";
    }
}

function readROBOXFile(file: File): Promise<Project | null> {
    return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
            if (!event.target || !event.target.result) {
                resolve(null);
                return;
            }
            try {
                const project = JSON.parse(event.target.result as string) as Project;
                resolve(project);
            } catch (e) {
                console.error("Failed to parse ROBOX file:", e);
                resolve(null);
            }
        };
        reader.readAsText(file);
    });
}
