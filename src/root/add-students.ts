import { getCurrentUserData, getFromDatabase, generateClassCode } from '@root/account';

// Hoist these so selectClassroom can reference them
let selectedClassroom: string | null = null;
let selectedClassroomData: any = null;

addEventListener("DOMContentLoaded", async () => {
    const currentUser = await getCurrentUserData();
    const classrooms: string[] = await getFromDatabase('profiles', currentUser.id, 'classrooms');

    const mount = document.querySelector<HTMLElement>(".my-classrooms-list");


    for (const uuid of classrooms) {
        const classroomInfo = await getFromDatabase('classrooms', uuid);
        if (!classroomInfo) continue;
        const card = createClassroomCard(uuid, classroomInfo);
        console.log("Classroom Card: ", card);
        card.addEventListener("click", async (event: MouseEvent) => {
            const card = event.currentTarget as HTMLElement;
            selectedClassroomData = await selectClassroom(uuid, card);
            selectedClassroom = uuid;
            event.stopPropagation();
        });

        if (mount) mount.appendChild(card);
    }

    const genCodeButton = document.getElementById("gen-code-button") as HTMLButtonElement | null;
    if (genCodeButton) {
        genCodeButton.addEventListener("click", async () => {
            if (!selectedClassroom) {
                console.warn("No classroom selected. Select a classroom first.");
                return;
            }
            try {
                console.log("Generating class code for: ", selectedClassroom);
                const code = await generateClassCode(selectedClassroom);
                displayClassCode(code);
            } catch (err) {
                console.error("Failed to generate class code:", err);
            }
        });
    }
});

function createClassroomCard(uuid: string, data: any): HTMLElement {
    const classroomTemplate = document.getElementById("classroomTemplate") as HTMLTemplateElement;
    if (!classroomTemplate) return document.createElement("div");

    const fragment = classroomTemplate.content.cloneNode(true) as DocumentFragment;
    const clone = fragment.querySelector(".card") as HTMLElement;
    if (!clone) return document.createElement("div");

    const title = clone.querySelector("h3.classroom-name") as HTMLHeadingElement | null;
    const courseCode = clone.querySelector("h4.course-code") as HTMLElement | null;
    const image = clone.querySelector(".classroom-avatar") as HTMLImageElement | null;
    const classInfo = clone.querySelector(".classroom-info") as HTMLElement | null;

    if (title) title.textContent = data.name || 'Classroom';
    if (image) image.src = data.avatar || "https://api.dicebear.com/9.x/bottts/svg?seed=Felix";
    if (courseCode) courseCode.textContent = data.course_code || (courseCode.style.display = 'none');
    if (classInfo) classInfo.textContent = `${Array.isArray(data.students) ? data.students.length : 0} students`;
    clone.id = uuid;

    return clone;
}

async function selectClassroom(uuid: string, item: HTMLElement): Promise<any> {
    // Check if the classroom is already selected
    if (selectedClassroom === uuid) return selectedClassroomData;
    const mount = document.querySelector<HTMLElement>(".my-classrooms-list");
    if (!mount) return;

    // Deselect all cards
    const cards = mount.querySelectorAll<HTMLElement>(".card");
    cards.forEach(card => card.classList.remove("selected"));

    // Select the clicked card
    const selectedCard = item;
    if (selectedCard) selectedCard.classList.add("selected");

    // Get the selected classroom data
    selectedClassroomData = await getFromDatabase('classrooms', uuid);

    // Display the class code for the selected classroom
    displayClassCode(selectedClassroomData.class_code || '');

    return selectedClassroomData
}

function displayClassCode(classCode: string) {
    const container = document.querySelector<HTMLElement>('.classcode-viewer');
    if (!container) return;

    container.innerHTML = '';

    const digits = String(classCode ?? '').slice(0, 8).split('');
    for (let i = 0; i < 8; i++) {
        const digitBox = document.createElement('div');
        digitBox.className = 'digit-box';
        digitBox.id = `digit-${i + 1}`;
        digitBox.textContent = digits[i] ?? '';
        container.appendChild(digitBox);
    }
}