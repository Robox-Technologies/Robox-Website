import { authCheck, signOut, deleteAccount, getCurrentUserData, writeToDatabase, updateHeaderAvatar } from '@root/account'
import { showNotification } from '@partials/notification/notification'

const titleElement = document.querySelector('h1.title') as HTMLHeadingElement
const generalPageContainer = document.querySelector('.general-page-container') as HTMLDivElement
const accountPageContainer = document.querySelector('.account-page-container') as HTMLDivElement
const appearancePageContainer = document.querySelector('.appearance-page-container') as HTMLDivElement
const notificationPageContainer = document.querySelector('.notification-page-container') as HTMLDivElement
const securityPageContainer = document.querySelector('.security-page-container') as HTMLDivElement
const advancedPageContainer = document.querySelector('.advanced-page-container') as HTMLDivElement
const deleteAccountModal = document.getElementById('delete-account-modal') as HTMLDialogElement | null
const avatarPreview = document.getElementById('avatar-image') as HTMLImageElement | null

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

const firstNameInput = document.getElementById('first-name-input') as HTMLInputElement | null
const lastNameInput = document.getElementById('last-name-input') as HTMLInputElement | null
const emailInput = document.getElementById('email-input') as HTMLInputElement | null

let currentPage = 'general'
let currentUserRole: string | null = null
let roleButtonsInitialized = false

const buttonMap = {
    'general': generalButton,
    'account': accountButton,
    'appearance': appearanceButton,
    'notification': notificationButton,
    'security': securityButton,
    'advanced': advancedButton
}

function switchHighlightedButton(page: string) {
    Object.values(buttonMap).forEach(button => button.classList.remove('active'))

    const selectedButton = buttonMap[page as keyof typeof buttonMap]
    if (selectedButton) {
        selectedButton.classList.add('active')
    } else {
        generalButton.classList.add('active')
    }
}

function hideAllContainers() {
    generalPageContainer.style.display = 'none'
    accountPageContainer.style.display = 'none'
    appearancePageContainer.style.display = 'none'
    notificationPageContainer.style.display = 'none'
    securityPageContainer.style.display = 'none'
    advancedPageContainer.style.display = 'none'
}

function generalPage() {
    titleElement.textContent = 'General Settings'
    generalPageContainer.style.display = 'block'
}

async function accountPage() {
    titleElement.textContent = 'Account Settings'
    accountPageContainer.style.display = 'block'
    const user = await getCurrentUserData()
    if (!user) {
        console.warn('No user data available')
        return
    }
    currentUserRole = user.user_role || null

    const studentRoleButton = document.getElementById('student-role-button') as HTMLButtonElement | null
    const teacherRoleButton = document.getElementById('teacher-role-button') as HTMLButtonElement | null

    studentRoleButton?.classList.toggle('selected', currentUserRole === 'student')
    teacherRoleButton?.classList.toggle('selected', currentUserRole === 'teacher')

    if (!roleButtonsInitialized) {
        roleButtonsInitialized = true

        studentRoleButton?.addEventListener('click', async () => {
            if (currentUserRole === 'student') return
            if (!user?.id) return
            try {
                await writeToDatabase('profiles', user.id, 'user_role', 'student', true)
                currentUserRole = 'student'
                studentRoleButton.classList.add('selected')
                teacherRoleButton?.classList.remove('selected')
                showNotification('Role changed to student', 'success', 'bottom', 5)
            } catch (e) {
                console.error('Failed to set role student', e)
            }
        })

        teacherRoleButton?.addEventListener('click', async () => {
            if (currentUserRole === 'teacher') return
            if (!user?.id) return
            try {
                await writeToDatabase('profiles', user.id, 'user_role', 'teacher', true)
                currentUserRole = 'teacher'
                teacherRoleButton.classList.add('selected')
                studentRoleButton?.classList.remove('selected')
                showNotification('Role changed to teacher', 'success', 'bottom', 5)
            } catch (e) {
                console.error('Failed to set role teacher', e)
            }
        })
    }
}

function appearancePage() {
    titleElement.textContent = 'Appearance Settings'
    appearancePageContainer.style.display = 'block'
}

function notificationPage() {
    titleElement.textContent = 'Notification Settings'
    notificationPageContainer.style.display = 'block'
}

function securityPage() {
    titleElement.textContent = 'Security Settings'
    securityPageContainer.style.display = 'block'
}

function advancedPage() {
    titleElement.textContent = 'Advanced Settings'
    advancedPageContainer.style.display = 'block'
}

function loadPage(page: string) {
    hideAllContainers()
    switchHighlightedButton(page)

    const params = new URLSearchParams(window.location.search)

    switch (page) {
        case 'general':
            generalPage()
            params.set('page', 'general')
            window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
            break
        case 'account':
            accountPage()
            params.set('page', 'account')
            window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
            break
        case 'appearance':
            appearancePage()            
            params.set('page', 'appearance')
            window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
            break
        case 'notification':
            notificationPage()
            params.set('page', 'notification')
            window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
            break
        case 'security':
            securityPage()
            params.set('page', 'security')
            window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
            break
        case 'advanced':
            advancedPage()
            params.set('page', 'advanced')
            window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
            break
    }

    updatePlaceholders()
}

async function initializeSettingsPage() {
    await authCheck()
    const user = await getCurrentUserData()
    if (user?.avatar_url && avatarPreview) {
        avatarPreview.src = user.avatar_url
    }
    const params = new URLSearchParams(window.location.search)
    const pageParam = params.get('page')
    if (pageParam && Object.keys(buttonMap).includes(pageParam)) {
        currentPage = pageParam
    }
    loadPage(currentPage)
}

async function deleteAccountRequest() {
    await deleteAccount()
    await signOut('/')
}

document.addEventListener('DOMContentLoaded', initializeSettingsPage)
logOutButton.addEventListener("click", () => signOut('/'))

Object.entries(buttonMap).forEach(([page, button]) => {
    button.addEventListener('click', () => { loadPage(page) })
})

deleteAccountButton.addEventListener('click', () => {
    deleteAccountModal.showModal()
})

deleteAccountModalButton.addEventListener('click', async () => {
    await deleteAccountRequest()
    window.location.href = '/'
})

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
        btn.dataset.url = url;
        btn.dataset.seed = seed;

        const img = document.createElement('img');
        img.src = url;
        img.alt = 'Pick avatar ' + (i + 1);
        img.loading = 'lazy';

        btn.appendChild(img);
        frag.appendChild(btn);
    }

    container.appendChild(frag);
}

const rows = 5, cols = 4;
const base = 'https://api.dicebear.com/9.x/bottts-neutral/svg?seed=';
const container = document.getElementById('avatars');

generateAvatarSelection();

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
            showNotification('Failed to save avatar', 'error', 'bottom', 5)
        }
    }
    showNotification('Avatar updated successfully', 'success', 'bottom', 5)
    updateHeaderAvatar(newAvatarUrl);
});

refreshAvatarButton.addEventListener('click', () => {
    container.innerHTML = '';
    generateAvatarSelection();
});

// Mobile menu toggle functionality
const mobileMenuToggle = document.getElementById('mobile-menu-toggle') as HTMLButtonElement | null
const sideMenu = document.getElementById('side-menu') as HTMLDivElement | null

if (mobileMenuToggle && sideMenu) {
    mobileMenuToggle.addEventListener('click', () => {
        sideMenu.classList.toggle('open')
        const icon = mobileMenuToggle.querySelector('i')
        if (icon) {
            icon.classList.toggle('fa-bars')
            icon.classList.toggle('fa-times')
        }
    })

    // Close menu when clicking a menu item on mobile
    sideMenu.querySelectorAll('.menu-item').forEach(item => {
        item.addEventListener('click', () => {
            if (window.innerWidth <= 768) {
                sideMenu.classList.remove('open')
                const icon = mobileMenuToggle.querySelector('i')
                if (icon) {
                    icon.classList.remove('fa-times')
                    icon.classList.add('fa-bars')
                }
            }
        })
    })

    // Close menu when clicking outside
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && 
            !sideMenu.contains(e.target as Node) && 
            !mobileMenuToggle.contains(e.target as Node)) {
            sideMenu.classList.remove('open')
            const icon = mobileMenuToggle.querySelector('i')
            if (icon) {
                icon.classList.remove('fa-times')
                icon.classList.add('fa-bars')
            }
        }
    })
}