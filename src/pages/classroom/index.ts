import { authCheck, getCurrentUserData, Classroom, getFromDatabase } from "@root/account";
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

    let currentPage: string = 'my-class'

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

    function studentsPage() {
        if (titleElement) titleElement.textContent = 'Students'
        if (studentsPageContainer) studentsPageContainer.style.display = 'block'
    }

    function learningPage() {
        if (titleElement) titleElement.textContent = 'Learning'
        if (learningPageContainer) learningPageContainer.style.display = 'block'
    }

    function settingsPage() {
        if (titleElement) titleElement.textContent = 'Settings'
        if (teacherSettingsPageContainer) teacherSettingsPageContainer.style.display = 'block'
    }

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
    try {
        const user = await getCurrentUserData()
        const firstNameInput = document.getElementById('first-name-input') as HTMLInputElement | null
        const lastNameInput = document.getElementById('last-name-input') as HTMLInputElement | null
        const emailInput = document.getElementById('email-input') as HTMLInputElement | null
        if (user) {
            if (firstNameInput) firstNameInput.placeholder = user.first_name || 'First Name'
            if (lastNameInput) lastNameInput.placeholder = user.last_name || 'Last Name'
            if (emailInput) emailInput.placeholder = user.email || 'Email'
        }
    } catch {
        // ignore
    }
}

async function checkClassroomAccess(id: string) {
    if (!id) {
        console.error("No classroom ID found in URL parameters.");
        window.location.href = "/classroom/home";
        return false;
    }

    if (!isValidUUID(id)) {
        console.error("Invalid classroom ID provided in URL parameters: ", id);
        window.location.href = "/classroom/home";
        return false;
    }

    const validClassroom = await isValidClassroom(id);
    if (validClassroom === false) {
        console.error("Classroom ID does not match any existing classroom: ", id);
        window.location.href = "/classroom/home";
        return false;
    }

    if (!user.id) {
        console.error("No current user found.");
        window.location.href = "/classroom/home";
        return false;
    }

    if (classroomRole === null) {
        console.error("User does not have permission to access this classroom: ", id, classroomRole);
        window.location.href = "/classroom/home";
        return false;
    }

    return true;
}

async function getClassroomData(id: string) {
    user = await getCurrentUserData();
    classroomRole = await getClassroomPermissions(id, user.id);
    classroom = await getFromDatabase('classrooms', id);
    studentsData = await getBasicUserData(classroom?.students || []);
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