import { createProject, getProject, getProjects, renameProject, sanitizeImageDataUrl, deleteProject } from "../../root/serialization";
import { Project } from "types/projects";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime.js";
import { toggleToolbar, moveToolbar } from "../../root/toolbar";
import { getProjectSyncStatus, syncCloudProjects, getCurrentUserData, getFromDatabase, removeClassroomFromProfile } from "@root/account";

dayjs.extend(relativeTime);

let userData: any = null;
async function userDataPromise() {
    console.log("Fetching user data for classrooms");
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
        const synced = await getProjectSyncStatus(uuid) as boolean;

        if (synced) {
            if (!currentUserId) {
                continue;
            }
            const owner = await getFromDatabase('projects', uuid, 'owner') as string | null;
            if (!owner || owner !== currentUserId) {
                continue;
            }
        }

        const card = createProjectCard(uuid, project, synced);
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
    const classroomIdsRaw = await getFromDatabase('profiles', userData.id, 'classrooms') as string[] | null;
    if (!Array.isArray(classroomIdsRaw) || classroomIdsRaw.length === 0) {
        console.warn("No classrooms found for user.");
        return;
    }
    const classroomIds = classroomIdsRaw;

    const classroomCards = document.querySelectorAll(".classroom-card");
    classroomCards.forEach((card) => {
        card.remove();
    });

    const classroomContainer = document.getElementById("classroom-holder");
    if (!classroomContainer) {
        console.warn("Classroom container not found.");
        return;
    }

    const toolbarModal = document.getElementById("project-toolbar") as HTMLDialogElement | null;

    for (const uuid of classroomIds) {
        const classroom = await getFromDatabase('classrooms', uuid) as any;
        console.log("Loading classroom with ID:", uuid);
        if (!classroom) {
            removeClassroomFromProfile(uuid, userData.id);
            continue;
        }

        const students: string[] = Array.isArray(classroom.students) ? classroom.students : [];
        const teachers: string[] = Array.isArray(classroom.teachers) ? classroom.teachers : [];

        const isStudent = students.includes(userData.id);
        const isTeacher = teachers.includes(userData.id) || classroom.owner === userData.id;
        console.log(`Classroom ${uuid} - Owner: ${classroom.owner}, Is Teacher: ${isTeacher}, Is Student: ${isStudent}`);
        if (!isTeacher && !isStudent) {
            removeClassroomFromProfile(uuid, userData.id);
            continue;
        }

        console.log("Creating classroom card for:", uuid);
        const card = createClassroomCard(uuid, classroom, isTeacher);
        card.addEventListener("click", (event: MouseEvent) => {
            const item = event.target as HTMLElement | null;
            if (!item) return;
            window.location.href = `/classroom?id=${uuid}`;
            event.stopPropagation();
        });
        const options = card.querySelector(".options") as HTMLButtonElement | null;
        if (options) {
            options.addEventListener("click", (event: MouseEvent) => {
                event.stopImmediatePropagation();
                if (toolbarModal) {
                    moveToolbar(toolbarModal, options, [10, 20]);
                    toggleToolbar(toolbarModal, true);
                }
            });
        }
        classroomContainer.appendChild(card);
    }
}

function createClassroomCard(uuid: string, classroom: any, type: boolean = false): HTMLElement {
    const templateId = type === true ? "teacherProjectCardTemplate" : "studentProjectCardTemplate";
    const projectTemplate = document.getElementById(templateId) as HTMLTemplateElement;
    if (!projectTemplate) return document.createElement("div");

    const fragment = projectTemplate.content.cloneNode(true) as DocumentFragment;
    const clone = fragment.querySelector(".card") as HTMLElement;
    if (!clone) return document.createElement("div");
    clone.classList.add("classroom-card");

    const title = clone.querySelector(".card-title-text");
    const time = clone.querySelector(".card-description");
    const image = clone.querySelector(".card-image") as HTMLImageElement | null;

    const classroomTime = dayjs(classroom.time);

    image.src = classroom.avatar_url;
    title.textContent = classroom.name || "Untitled Classroom";
    time.textContent = classroomTime.isValid() ? classroomTime.fromNow() : "";
    clone.id = uuid;

    console.log("Creating classroom card:", clone.id, title.textContent, time.textContent);
    return clone;
}

function hideCreateClassroomButton() {
    const createProjectButton = document.getElementById("create-classroom");
    if (createProjectButton && userData.user_role === 'student') {
        createProjectButton.style.display = "none";
    }
}