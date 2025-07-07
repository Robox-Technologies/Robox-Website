import { createProject, getProject, getProjects, renameProject } from "../../root/serialization";
import { Project, Projects } from "types/projects";
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
    let sortedByTime = projectIds.sort((a, b) =>
        dayjs(projects[b].time).diff(dayjs(projects[a].time))
    );
    for (const uuid of sortedByTime) {
        let project = projects[uuid];
        let card = createProjectCard(uuid, project);
        card.addEventListener("click", (event: MouseEvent) => {
            let item = event.target as HTMLElement | null;
            if (!item) return;
            window.location.href = `/editor?id=${uuid}`;
            event.stopPropagation();
        });
        let options = card.querySelector(".options") as HTMLButtonElement | null;
        if (!options) continue;
        options.addEventListener("click", (event: MouseEvent) => {
            event.stopImmediatePropagation();
            moveToolbar(toolbarModal, options);
            toggleToolbar(toolbarModal, true);
        });
        projectContainer.appendChild(card);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    applyProjects();
    const createProjectButton = document.getElementById("create-project");
    createProjectButton?.addEventListener("click", () => {
        createProject("unnamed project");
        applyProjects();
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
        let project = getProject(projectId);
        if (!project) return;
        renameProject(projectId, projectNameInput.value);
        applyProjects();
        projectCard = document.querySelector(`.project-card#${projectId}`) as HTMLElement | null;
        if (projectCard) {
            moveToolbar(toolbarModal, projectCard.querySelector(".options") as HTMLElement);
        }
        editModal.close();
    });
    deleteConfirmButton.addEventListener("click", () => {
        let projectCard = document.querySelector(".toolbar-target")?.closest(".project-card") as HTMLElement | null;
        if (!projectCard) return;
        const projectId = projectCard.id;
        if (!projectId) return;
        let projects = getProjects();
        if (projects[projectId]) {
            delete projects[projectId];
            localStorage.setItem("roboxProjects", JSON.stringify(projects));
            applyProjects();
            //Move the toolbar to the renamed project card if it exists
            toggleToolbar(toolbarModal, false);
        }
        deleteModal.close();
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

    let projectTime = dayjs(project.time);

    image.src = project.thumbnail;
    title.textContent = project.name;
    time.textContent = projectTime.fromNow();
    clone.id = uuid;

    return clone;
}
