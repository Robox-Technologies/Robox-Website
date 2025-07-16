import { authCheck, signOut } from '@root/account'

// Containers
const titleElement = document.querySelector('h1.title') as HTMLHeadingElement
const generalPageContainer = document.querySelector('.general-page-container') as HTMLDivElement
const accountPageContainer = document.querySelector('.account-page-container') as HTMLDivElement
const appearancePageContainer = document.querySelector('.appearance-page-container') as HTMLDivElement
const notificationPageContainer = document.querySelector('.notification-page-container') as HTMLDivElement
const securityPageContainer = document.querySelector('.security-page-container') as HTMLDivElement
const advancedPageContainer = document.querySelector('.advanced-page-container') as HTMLDivElement
// Buttons
const generalButton = document.getElementById('general-button') as HTMLButtonElement
const accountButton = document.getElementById('account-button') as HTMLButtonElement
const appearanceButton = document.getElementById('appearance-button') as HTMLButtonElement
const notificationButton = document.getElementById('notification-button') as HTMLButtonElement
const securityButton = document.getElementById('security-button') as HTMLButtonElement
const advancedButton = document.getElementById('advanced-button') as HTMLButtonElement
const logOutButton = document.getElementById('logout-button') as HTMLButtonElement

let currentPage = 'general'

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

function accountPage() {
    titleElement.textContent = 'Account Settings'
    accountPageContainer.style.display = 'block'
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
}

async function initializeSettingsPage() {
    await authCheck()
    loadPage(currentPage)
}

document.addEventListener('DOMContentLoaded', initializeSettingsPage)
logOutButton.addEventListener("click", () => signOut('/'))

Object.entries(buttonMap).forEach(([page, button]) => {
    button.addEventListener('click', () => { loadPage(page) })
})