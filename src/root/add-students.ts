import { getCurrentUserData, getFromDatabase } from './account';

addEventListener("DOMContentLoaded", async () => {
    const currentUser = await getCurrentUserData();
    const classrooms: string[] = await getFromDatabase('profiles', currentUser.id, 'classrooms');

    const mount = document.querySelector<HTMLElement>(".my-classrooms-list");

    for (const uuid of classrooms) {
        const classroomInfo = await getFromDatabase('classrooms', uuid);
        if (!classroomInfo) continue;
        const card = createClassroomCard(uuid, classroomInfo);
        console.log("Classroom Card: ", card);
        card.addEventListener("click", (event: MouseEvent) => {
            const item = event.target as HTMLElement | null;
            if (!item) return;
            window.location.href = `/classroom?id=${uuid}`;
            event.stopPropagation();
        });

        if (mount) mount.appendChild(card);
    }
});

function createClassroomCard(uuid: string, data: any): HTMLElement {
    const classroomTemplate = document.getElementById("classroomTemplate") as HTMLTemplateElement;
    if (!classroomTemplate) return document.createElement("div");

    const fragment = classroomTemplate.content.cloneNode(true) as DocumentFragment;
    const clone = fragment.querySelector(".card") as HTMLElement;
    if (!clone) return document.createElement("div");

    const title = clone.querySelector("h3.classroom-name") as HTMLHeadingElement | null;
    const classCode = clone.querySelector("h4.classroom-code") as HTMLElement | null;
    const image = clone.querySelector(".classroom-avatar") as HTMLImageElement | null;
    const classInfo = clone.querySelector(".classroom-info") as HTMLElement | null;

    image.src = "https://api.dicebear.com/9.x/bottts/svg?seed=Felix";
    if (title) title.textContent = data.name || 'Classroom';
    if (classCode) classCode.textContent = data.class_code || '' ; else classCode.style.display = 'none';
    if (image) image.src = data.avatar || "https://api.dicebear.com/9.x/bottts/svg?seed=Felix";
    if (classInfo) classInfo.textContent = `${Array.isArray(data.students) ? data.students.length : 0} students`;
    clone.id = uuid;

    return clone;
}