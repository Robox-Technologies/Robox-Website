import { authCheck, getCurrentUserData, getFromDatabase } from "@root/account";
let currentUser: any | null = null;
let classroom: Classroom | null = null;
let classroomRole: string | null = null; // 'owner' | 'teacher' | 'student' | null
let currentPage: string = 'my-class'

async function initUI() {
    // Containers
    const titleElement = document.querySelector('h1.title') as HTMLHeadingElement
    // Student Pages
    const myClassPageContainer = document.querySelector('.my-class-page-container') as HTMLDivElement | null
    const studentSettingsPageContainer = document.querySelector('.student-settings-page-container') as HTMLDivElement | null
    // Teacher Pages
    const homePageContainer = document.querySelector('.home-page-container') as HTMLDivElement | null
    const studentsPageContainer = document.querySelector('.students-page-container') as HTMLDivElement | null
    const learningPageContainer = document.querySelector('.learning-page-container') as HTMLDivElement | null
    const teacherSettingsPageContainer = document.querySelector('.settings-page-container') as HTMLDivElement | null
    // Buttons
    const myClassButton = document.getElementById('my-class-button') as HTMLButtonElement | null
    const studentSettingsButton = document.getElementById('student-settings-button') as HTMLButtonElement | null
    const homeButton = document.getElementById('home-button') as HTMLButtonElement | null
    const studentsButton = document.getElementById('students-button') as HTMLButtonElement | null
    const learningButton = document.getElementById('learning-button') as HTMLButtonElement | null
    const settingsButton = document.getElementById('settings-button') as HTMLButtonElement | null
    const saveSettingsButton = document.getElementById('save-classroom-settings-button') as HTMLButtonElement | null

    const buttonMap = {
        'my-class': myClassButton,
        'student-settings': studentSettingsButton,
        'home': homeButton,
        'students': studentsButton,
        'learning': learningButton,
        'settings': settingsButton
    }

    function updateButtons() {
        if (!classroomRole) return;

        const url = new URL(window.location.href);

        if (classroomRole === 'teacher' || classroomRole === 'owner') {
            if (!url.searchParams.get("page") || currentPage === 'my-class' || currentPage === 'student-settings') currentPage = 'home';
            if (myClassButton) myClassButton.style.display = 'none';
            if (studentSettingsButton) studentSettingsButton.style.display = 'none';
            if (homeButton) homeButton.style.display = 'block';
            if (studentsButton) studentsButton.style.display = 'block';
            if (learningButton) learningButton.style.display = 'block';
            if (settingsButton) settingsButton.style.display = 'block';
        } else {
            if (!url.searchParams.get("page") || currentPage === 'home' || currentPage === 'students' || currentPage === 'learning' || currentPage === 'settings') currentPage = 'my-class';
            if (homeButton) homeButton.style.display = 'none';
            if (studentsButton) studentsButton.style.display = 'none';
            if (learningButton) learningButton.style.display = 'none';
            if (settingsButton) settingsButton.style.display = 'none';
            if (myClassButton) myClassButton.style.display = 'block';
            if (studentSettingsButton) studentSettingsButton.style.display = 'block';
        }
    }
    function switchHighlightedButton(page: keyof typeof buttonMap) {
        Object.values(buttonMap).forEach(button => button?.classList.remove('active'))
        const selectedButton = buttonMap[page]
        if (selectedButton) {
            selectedButton.classList.add('active')
        } else {
            homeButton?.classList.add('active')
        }
    }

    function hideAllContainers() {
        if (myClassPageContainer) myClassPageContainer.style.display = 'none'
        if (studentSettingsPageContainer) studentSettingsPageContainer.style.display = 'none'
        if (homePageContainer) homePageContainer.style.display = 'none'
        if (studentsPageContainer) studentsPageContainer.style.display = 'none'
        if (learningPageContainer) learningPageContainer.style.display = 'none'
        if (teacherSettingsPageContainer) teacherSettingsPageContainer.style.display = 'none'
    }

    function myClassPage() {
        if (titleElement) titleElement.textContent = 'My Class'
        if (myClassPageContainer) myClassPageContainer.style.display = 'block'
    }

    function studentSettingsPage() {
        if (titleElement) titleElement.textContent = 'Student Settings'
        if (studentSettingsPageContainer) studentSettingsPageContainer.style.display = 'block'
    }

    function homePage() {
        if (titleElement) titleElement.textContent = 'Home'
        if (homePageContainer) homePageContainer.style.display = 'block'
    }

    async function studentsPage() {
        if (titleElement) titleElement.textContent = 'Students'
        if (studentsPageContainer) studentsPageContainer.style.display = 'block'
        await loadStudentCards();
    }

    function learningPage() {
        if (titleElement) titleElement.textContent = 'Learning'
        if (learningPageContainer) learningPageContainer.style.display = 'block'
    }

    function settingsPage() {
        if (titleElement) titleElement.textContent = 'Settings'
        if (teacherSettingsPageContainer) teacherSettingsPageContainer.style.display = 'block'
    }

    saveSettingsButton?.addEventListener('click', async () => {
        const classroomNameInput = document.getElementById('name-input') as HTMLInputElement | null;
        const classroomDescriptionInput = document.getElementById('description-input') as HTMLInputElement | null;
        const classroomYearLevelInput = document.getElementById('year-level-input') as HTMLInputElement | null;
        const classroomCourseCodeInput = document.getElementById('course-code-input') as HTMLInputElement | null;
        const classroomLocationInput = document.getElementById('location-input') as HTMLInputElement | null;
        const classroomLmsInput = document.getElementById('lms-input') as HTMLInputElement | null;
        const classroomSecurityInput = document.getElementById('security-radio') as HTMLInputElement | null;
        const classroomFeaturesInput = document.getElementById('features-list') as HTMLInputElement | null;
        const classroomColorInput = document.getElementById('color-input') as HTMLInputElement | null;

        classroom.name = classroomNameInput?.value || '';
        classroom.description = classroomDescriptionInput?.value || '';
        classroom.year_level = classroomYearLevelInput?.value || '';
        classroom.course_code = classroomCourseCodeInput?.value || '';
        classroom.location = classroomLocationInput?.value || '';
        classroom.lms_url = (classroomLmsInput?.value.trim() || '');
        classroom.security_level = classroomSecurityInput?.value || '1';
        classroom.features = (classroomFeaturesInput?.value.split(',').map(f => f.trim()) || []);
        classroom.color = (classroomColorInput?.value || '#ffffff');

        await classroom.save();
    });

    function loadPage(page: keyof typeof buttonMap) {
        hideAllContainers()
        switchHighlightedButton(page)
        
        const url = new URL(window.location.href);
        url.searchParams.set('page', page);
        window.history.pushState({}, '', url);

        switch (page) {
            case 'my-class':
                myClassPage()
                break
            case 'student-settings':
                studentSettingsPage()
                break
            case 'home':
                homePage()
                break
            case 'students':
                studentsPage()
                break
            case 'learning':
                learningPage()
                break
            case 'settings':
                settingsPage()
                break
        }

        updatePlaceholders()
    }

    updateButtons()
    loadPage(currentPage)

    Object.entries(buttonMap).forEach(([page, button]) => {
        button?.addEventListener('click', () => { loadPage(page as keyof typeof buttonMap) })
    });

    console.log('Settings page initialized')
}

async function updatePlaceholders() {
    document.querySelectorAll('#classroom-name').forEach(el => {
        (el as HTMLElement).textContent = (classroom?.name) || 'My Classroom';
    });
    if (currentUser) {
        const firstNameInput = document.getElementById('first-name-input') as HTMLInputElement | null;
        const lastNameInput = document.getElementById('last-name-input') as HTMLInputElement | null;
        const emailInput = document.getElementById('email-input') as HTMLInputElement | null;
        if (firstNameInput) firstNameInput.placeholder = currentUser.first_name || 'First Name';
        if (lastNameInput) lastNameInput.placeholder = currentUser.last_name || 'Last Name';
        if (emailInput) emailInput.placeholder = currentUser.email || 'Email';
    }
    if (classroom) {
        const classroomNameInput = document.getElementById('name-input') as HTMLInputElement | null;
        const classroomDescriptionInput = document.getElementById('description-input') as HTMLInputElement | null;
        const classroomYearLevelInput = document.getElementById('year-level-input') as HTMLInputElement | null;
        const classroomCourseCodeInput = document.getElementById('course-code-input') as HTMLInputElement | null;
        const classroomLocationInput = document.getElementById('location-input') as HTMLInputElement | null;
        const classroomLmsInput = document.getElementById('lms-input') as HTMLInputElement | null;
        const classroomSecurityInput = document.getElementById('security-radio') as HTMLInputElement | null;
        const classroomFeaturesInput = document.getElementById('features-list') as HTMLInputElement | null;
        const classroomColorInput = document.getElementById('color-input') as HTMLInputElement | null;

        if (classroomNameInput) classroomNameInput.placeholder = classroom.name || 'Classroom Name';
        if (classroomDescriptionInput) classroomDescriptionInput.placeholder = classroom.description || 'Classroom Description';
        if (classroomYearLevelInput) classroomYearLevelInput.placeholder = classroom.year_level || 'Year Level';
        if (classroomCourseCodeInput) classroomCourseCodeInput.placeholder = classroom.course_code || 'Course Code';
        if (classroomLocationInput) classroomLocationInput.placeholder = classroom.location || 'Location';
        if (classroomLmsInput) classroomLmsInput.placeholder = classroom.lms_url || 'LMS URL';
        if (classroomSecurityInput) classroomSecurityInput.value = String(classroom.security_level);
        if (classroomFeaturesInput) classroomFeaturesInput.value = (classroom.features && Array.isArray(classroom.features)) ? classroom.features.join(', ') : '';
        if (classroomColorInput) classroomColorInput.value = classroom.color || '#ffffff';
    }
}

function checkClassroomAccess(): boolean {
    if (!classroom || !currentUser?.id || !classroomRole) {
        window.location.href = '/classroom/home';
        return false;
    }
    return true;
}
async function loadClassroom(id: string) {
    currentUser = await getCurrentUserData();
    if (!id) return;
    classroom = await Classroom.load(id);
    if (classroom && currentUser?.id) {
        classroomRole = await classroom.roleForUser(currentUser.id);
    }
}

async function loadStudentCards() {
    const studentsList = document.querySelector('.students-list') as HTMLDivElement | null;
    if (!studentsList || !classroom) return;

    studentsList.innerHTML = '';

    for (const student of classroom.students) {
        const studentCard = await createStudentCard(student);
        studentsList.appendChild(studentCard);
    }
}

async function createStudentCard(student: any): Promise<HTMLElement> {
    const studentData = await getFromDatabase('profiles', student)
    const projectTemplate = document.getElementById('studentCardTemplate') as HTMLTemplateElement;
    if (!projectTemplate) return document.createElement("div");

    const fragment = projectTemplate.content.cloneNode(true) as DocumentFragment;
    const clone = fragment.querySelector(".card") as HTMLElement;
    if (!clone) return document.createElement("div");

    const nameEl = clone.querySelector(".student-name");
    const emailEl = clone.querySelector(".student-email");
    const avatarEl = clone.querySelector(".student-avatar") as HTMLImageElement | null;

    if (nameEl) nameEl.textContent = studentData.display_name || studentData.first_name || "Unnamed Student";
    if (emailEl) emailEl.textContent = studentData.email || "";
    if (avatarEl) {
        avatarEl.src = studentData.avatar_url;
    }

    clone.id = studentData.id;

    return clone;
}

(async () => {
    await authCheck();
    const url = new URL(window.location.href);
    const id = url.searchParams.get("id") || "";
    currentPage = url.searchParams.get("page") || 'my-class';
    await loadClassroom(id);
    const ok = checkClassroomAccess();
    if (ok) {
        await initUI();
    }
})();