import { authCheck, signOut, deleteAccount, getCurrentUserData, writeToDatabase,  } from '@root/account'
import { getEnabledCategories } from 'trace_events'

// containers for different settings pages
const titleElement = document.querySelector('h1.title') as HTMLHeadingElement
const generalPageContainer = document.querySelector('.general-page-container') as HTMLDivElement
const accountPageContainer = document.querySelector('.account-page-container') as HTMLDivElement
const appearancePageContainer = document.querySelector('.appearance-page-container') as HTMLDivElement
const notificationPageContainer = document.querySelector('.notification-page-container') as HTMLDivElement
const securityPageContainer = document.querySelector('.security-page-container') as HTMLDivElement
const advancedPageContainer = document.querySelector('.advanced-page-container') as HTMLDivElement
const deleteAccountModal = document.getElementById('delete-account-modal') as HTMLDialogElement | null
const avatarPreview = document.getElementById('avatar-image') as HTMLImageElement | null
// Buttons
const generalButton = document.getElementById('general-button') as HTMLButtonElement
const accountButton = document.getElementById('account-button') as HTMLButtonElement
const appearanceButton = document.getElementById('appearance-button') as HTMLButtonElement
const notificationButton = document.getElementById('notification-button') as HTMLButtonElement
const securityButton = document.getElementById('security-button') as HTMLButtonElement
const advancedButton = document.getElementById('advanced-button') as HTMLButtonElement
const logOutButton = document.getElementById('logout-button') as HTMLButtonElement
const deleteAccountButton = document.getElementById('delete-account-button') as HTMLButtonElement
const deleteAccountModalButton = document.getElementById('confirm-delete-button') as HTMLDivElement
const refreshAvatarButton = document.getElementById('refresh-avatars-button') as HTMLButtonElement
// Inputs
const firstNameInput = document.getElementById('first-name-input') as HTMLInputElement | null
const lastNameInput = document.getElementById('last-name-input') as HTMLInputElement | null
const emailInput = document.getElementById('email-input') as HTMLInputElement | null

let currentPage = 'general' // string to keep track of which page is active, always a string
let currentUserRole: string | null = null // user role can be string or null if there is a problem getting the role
let roleButtonsInitialized = false // boolean to make sure role buttons only get initialized once

// map of page names to their button elements - keys are strings and values are buttons
const buttonMap = {
    'general': generalButton,
    'account': accountButton,
    'appearance': appearanceButton,
    'notification': notificationButton,
    'security': securityButton,
    'advanced': advancedButton
}

// highlights the selected nav button, uses string for page name
function switchHighlightedButton(page: string) {
    Object.values(buttonMap).forEach(button => button.classList.remove('active')) // remove highlight from all

    const selectedButton = buttonMap[page as keyof typeof buttonMap] // get the button for the page
    if (selectedButton) {
        selectedButton.classList.add('active') // highlight the selected one
    } else {
        generalButton.classList.add('active') // fallback to general if not found
    }
}

// hides all settings containers, just sets display to none
function hideAllContainers() {
    generalPageContainer.style.display = 'none'
    accountPageContainer.style.display = 'none'
    appearancePageContainer.style.display = 'none'
    notificationPageContainer.style.display = 'none'
    securityPageContainer.style.display = 'none'
    advancedPageContainer.style.display = 'none'
}

// shows general settings, updates title, uses string for title
function generalPage() {
    titleElement.textContent = 'General Settings'
    generalPageContainer.style.display = 'block'
}

// loads account settings, fetches user data, updates role buttons, uses async for database calls
async function accountPage() {
    titleElement.textContent = 'Account Settings'
    accountPageContainer.style.display = 'block'
    const user = await getCurrentUserData() // get user info from db
    if (!user) {
        console.warn('No user data available')
        return
    }
    currentUserRole = user.user_role || null // user_role is string or null

    const studentRoleButton = document.getElementById('student-role-button') as HTMLButtonElement | null // button for student role
    const teacherRoleButton = document.getElementById('teacher-role-button') as HTMLButtonElement | null // button for teacher role

    studentRoleButton?.classList.toggle('selected', currentUserRole === 'student') // highlight if student
    teacherRoleButton?.classList.toggle('selected', currentUserRole === 'teacher') // highlight if teacher

    if (!roleButtonsInitialized) {
        roleButtonsInitialized = true // only add listeners once

        studentRoleButton?.addEventListener('click', async () => {
            if (currentUserRole === 'student') return // do nothing if already student
            if (!user?.id) return // need user id
            try {
                await writeToDatabase('profiles', user.id, 'user_role', 'student', true) // update db
                currentUserRole = 'student'
                studentRoleButton.classList.add('selected')
                teacherRoleButton?.classList.remove('selected')
            } catch (e) {
                console.error('Failed to set role student', e)
            }
        })

        teacherRoleButton?.addEventListener('click', async () => {
            if (currentUserRole === 'teacher') return // do nothing if already teacher
            if (!user?.id) return
            try {
                await writeToDatabase('profiles', user.id, 'user_role', 'teacher', true) // update db
                currentUserRole = 'teacher'
                teacherRoleButton.classList.add('selected')
                studentRoleButton?.classList.remove('selected')
            } catch (e) {
                console.error('Failed to set role teacher', e)
            }
        })
    }
}

// shows appearance settings
function appearancePage() {
    titleElement.textContent = 'Appearance Settings'
    appearancePageContainer.style.display = 'block'
}

// shows notification settings
function notificationPage() {
    titleElement.textContent = 'Notification Settings'
    notificationPageContainer.style.display = 'block'
}

// shows security settings
function securityPage() {
    titleElement.textContent = 'Security Settings'
    securityPageContainer.style.display = 'block'
}

// shows advanced settings
function advancedPage() {
    titleElement.textContent = 'Advanced Settings'
    advancedPageContainer.style.display = 'block'
}

// loads the selected settings page, uses string for page name
function loadPage(page: string) {
    hideAllContainers()
    switchHighlightedButton(page)

    switch (page) {
        case 'general':
            generalPage()
            break
        case 'account':
            accountPage()
            break
        case 'appearance':
            appearancePage()
            break
        case 'notification':
            notificationPage()
            break
        case 'security':
            securityPage()
            break
        case 'advanced':
            advancedPage()
            break
    }

    updatePlaceholders()
}

// checks auth and loads the current page, async because authCheck might be async
async function initializeSettingsPage() {
    await authCheck()
    const user = await getCurrentUserData()
    if (user?.avatar_url && avatarPreview) {
        avatarPreview.src = user.avatar_url
    }
    loadPage(currentPage)
}

// deletes account and signs out, async for db and auth actions
async function deleteAccountRequest() {
    await deleteAccount()
    await signOut('/')
}

// runs when page is loaded, sets up everything
document.addEventListener('DOMContentLoaded', initializeSettingsPage)
// log out button signs user out, string for redirect url
logOutButton.addEventListener("click", () => signOut('/'))

// add click listeners to nav buttons, page is string, button is HTMLButtonElement
Object.entries(buttonMap).forEach(([page, button]) => {
    button.addEventListener('click', () => { loadPage(page) })
})

// open the delete account modal when button is clicked
deleteAccountButton.addEventListener('click', () => {
    deleteAccountModal.showModal()
})

// confirm delete, then redirect to home - async for request
deleteAccountModalButton.addEventListener('click', async () => {
    await deleteAccountRequest()
    window.location.href = '/'
})

// updates input placeholders with user data - async for db call
async function updatePlaceholders() {
    const user = await getCurrentUserData()
    firstNameInput.placeholder = user.first_name || 'First Name'
    lastNameInput.placeholder = user.last_name || 'Last Name'
    emailInput.placeholder = user.email || 'Email'
}

function generateAvatarSelection() {
    const frag = document.createDocumentFragment();
    for (let i = 0; i < rows * cols; i++) {
        const seed = crypto.randomUUID();
        const url = base + encodeURIComponent(seed);

        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'avatar-btn';
        btn.dataset.url = url;   // what we will store
        btn.dataset.seed = seed; // handy if you want to store seed too

        const img = document.createElement('img');
        img.src = url;
        img.alt = 'Pick avatar ' + (i + 1);
        img.loading = 'lazy';

        btn.appendChild(img);
        frag.appendChild(btn);
    }

    container.appendChild(frag);
}

// Avatar picker 
const rows = 4, cols = 6;
const base = 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=';
const container = document.getElementById('avatars');

generateAvatarSelection();

// Click handler with event delegation
container.addEventListener('click', async (e) => {
    const btn = (e.target as HTMLElement).closest('.avatar-btn');
    if (!btn) return;

    const newAvatarUrl = btn.dataset.url;
    if (newAvatarUrl && avatarPreview) {
        avatarPreview.src = newAvatarUrl;
    }

    const user = await getCurrentUserData();
    if (user?.id && newAvatarUrl) {
        try {
            await writeToDatabase('profiles', user.id, 'avatar_url', newAvatarUrl, true);
        } catch (error) {
            console.error('Failed to save avatar:', error);
        }
    }
});

refreshAvatarButton.addEventListener('click', () => {
    container.innerHTML = '';
    generateAvatarSelection();
});