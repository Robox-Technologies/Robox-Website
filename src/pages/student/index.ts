import {
    createProject,
    getProject,
    getProjects,
    importProject,
    renameProject,
    deleteProject,
    sanitizeImageDataUrl
} from "@root/blockly/serialization";
import { Project } from "~types/projects";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime.js";
import { toggleToolbar, moveToolbar } from "@partials/toolbar/toolbar";
import { syncCloudProjects, getCurrentUserData, getFromDatabase, removeClassroomFromProfile, Classroom } from "@root/account";

dayjs.extend(relativeTime);

interface StudentUser { id: string; user_role?: string; }
let userData: StudentUser | null = null;
async function userDataPromise() {
	try {
		userData = await getCurrentUserData() ?? null;
		if (!userData) console.warn("No user data found, cannot apply classrooms.");
	} catch (err) {
		console.warn("Failed to get user data", err);
		userData = null;
	}
	return userData;
};

async function applyProjects() {
    const projectCards = document.querySelectorAll(".project-card");
    projectCards.forEach((card) => {
        card.remove();
    });

    const currentUserId = userData?.id as string | undefined;
    await syncCloudProjects(currentUserId);

    const projectContainer = document.getElementById("project-holder");
    const projectCloudTemplate = document.getElementById("cloudProjectCardTemplate") as HTMLTemplateElement;
    const projectLocalTemplate = document.getElementById("localProjectCardTemplate") as HTMLTemplateElement;
    const toolbarModal = document.getElementById("project-toolbar") as HTMLDialogElement;
    if (!projectContainer || !projectCloudTemplate || !projectLocalTemplate || !toolbarModal) return;

    const projects = getProjects();
    const projectIds = Object.keys(projects);
    const sortedByTime = projectIds.sort((a, b) =>
        dayjs(projects[b].time).diff(dayjs(projects[a].time))
    );
    for (const uuid of sortedByTime) {
        const project = projects[uuid];
        const cloudProject = await getFromDatabase('projects', uuid) as (Project & { owner?: string; time?: number; last_updated?: number }) | null;

        let isSynced = false;
        if (cloudProject) {
            if (!currentUserId) continue;
            if (!cloudProject.owner || cloudProject.owner !== currentUserId) continue;
            const newTime = cloudProject.last_updated ?? cloudProject.time;
            if (typeof newTime === 'number') project.time = dayjs(newTime);
            isSynced = true;
        }

        const card = createProjectCard(uuid, project, isSynced);
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

document.addEventListener("DOMContentLoaded", async () => {
    await userDataPromise();
    if (!userData) {
        const classroomsSection = document.getElementById("classrooms");
        classroomsSection.style.display = "none";
    }
    await Promise.allSettled([applyProjects(), applyClassrooms(), hideCreateClassroomButton()]);

    const createProjectButton = document.getElementById("create-project");
    if (createProjectButton) {
        createProjectButton.addEventListener("click", async () => {
            const uuid = await createProject("unnamed project");
            window.location.href = `/editor?id=${uuid}`;
        });
    }

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

    editConfirmButton.addEventListener("click", async () => {
        let projectCard = document.querySelector(".toolbar-target")?.closest(".project-card") as HTMLElement | null;
        if (!projectCard) return;
        const projectId = projectCard.id;
        if (!projectId) return;
        const project = getProject(projectId);
        if (!project) return;
        await renameProject(projectId, projectNameInput.value);
        await applyProjects();
        projectCard = document.getElementById(projectId) as HTMLElement | null;
        if (projectCard) {
            moveToolbar(toolbarModal, projectCard.querySelector(".options") as HTMLElement);
        }
        editModal.close();
    });

    deleteConfirmButton.addEventListener("click", async () => {
        const projectCard = document.querySelector(".toolbar-target")?.closest(".project-card") as HTMLElement | null;
        if (!projectCard) return;
        const projectId = projectCard.id;
        if (!projectId) return;
        const projects = getProjects();
        if (projects[projectId]) {
            await deleteProject(projectId);
            delete projects[projectId];
            localStorage.setItem("roboxProjects", JSON.stringify(projects));
            await applyProjects();
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

function createProjectCard(uuid: string, project: Project, type: boolean = false): HTMLElement {
    const templateId = type === true ? "cloudProjectCardTemplate" : "localProjectCardTemplate";
    const projectTemplate = document.getElementById(templateId) as HTMLTemplateElement;
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

async function applyClassrooms() {
    if (!userData) {
        console.warn("No user data available for classrooms. Skipping classroom rendering.");
        return;
    }
    const classroomIds = await getFromDatabase('profiles', userData.id, 'classrooms') as string[] | null;
    if (!Array.isArray(classroomIds) || classroomIds.length === 0) return;

    // Remove existing cards
    document.querySelectorAll(".classroom-card").forEach(card => card.remove());

    const classroomContainer = document.getElementById("classroom-holder");
    if (!classroomContainer) return;
    
    for (const id of classroomIds) {
        const classroomData = await Classroom.load(id);
        if (!classroomData) {
            removeClassroomFromProfile(id, userData.id);
            continue;
        }
        const role = await classroomData.roleForUser(userData.id);
        if (!role) {
            removeClassroomFromProfile(id, userData.id);
            continue;
        }

        const isTeacher = role === 'teacher' || role === 'owner';
        const card = createClassroomCard(classroomData, isTeacher);

        card.addEventListener("click", (event: MouseEvent) => {
            if (!(event.target as HTMLElement)) return;
            window.location.href = `/classroom?id=${id}`;
            event.stopPropagation();
        });

        classroomContainer.appendChild(card);
    }
}

function createClassroomCard(classroom: Classroom, isTeacher: boolean = false): HTMLElement {
    const templateId = isTeacher ? "teacherClassroomCardTemplate" : "studentClassroomCardTemplate";
    const projectTemplate = document.getElementById(templateId) as HTMLTemplateElement;
    if (!projectTemplate) return document.createElement("div");

    const fragment = projectTemplate.content.cloneNode(true) as DocumentFragment;
    const clone = fragment.querySelector(".card") as HTMLElement;
    if (!clone) return document.createElement("div");
    clone.classList.add("classroom-card");

    const title = clone.querySelector(".card-title-text");
    const description = clone.querySelector(".card-description");
    const color = clone.querySelector(".card-color") as HTMLImageElement | null;

    if (color) {
        color.style.backgroundColor = classroom.color || "#2588C7";
    }
    title.textContent = classroom.name || "Untitled Classroom";
    description.textContent = `${classroom.students.length} Students`;
    clone.id = classroom.id;

    return clone;
}

function hideCreateClassroomButton() {
    const createProjectButton = document.getElementById("create-classroom");
    if (createProjectButton && userData.user_role === 'student') {
        createProjectButton.style.display = "none";
    }
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
