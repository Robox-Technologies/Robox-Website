import { createClient } from '@supabase/supabase-js'
import { isAuthenticated, getCurrentUserData, checkPasswordRequirements } from '@root/account'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Containers
const titleElement = document.querySelector('h1.title') as HTMLHeadingElement
const emailContainer = document.querySelector('.email-container') as HTMLDivElement
const codeContainer = document.querySelector('.code-container') as HTMLDivElement
const newPasswordContainer = document.querySelector('.new-password-container') as HTMLDivElement
// Inputs and Buttons
const emailInput = document.getElementById('email-input') as HTMLInputElement
const codeInput = document.getElementById('code-input') as HTMLInputElement
const newPasswordInput = document.getElementById('password-input') as HTMLInputElement
const confirmPasswordInput = document.getElementById('confirm-password-input') as HTMLInputElement
const continueButton = document.getElementById('login-button') as HTMLButtonElement
const backButton = document.getElementById('back-button') as HTMLButtonElement
const infoTextElement = document.getElementById('info-text') as HTMLParagraphElement
// Error Messages
const emailErrorMsg = document.getElementById('email-error-msg') as HTMLParagraphElement
const codeErrorMsg = document.getElementById('code-error-msg') as HTMLParagraphElement
const newPasswordErrorMsg = document.getElementById('new-password-error-msg') as HTMLParagraphElement
const confirmPasswordErrorMsg = document.getElementById('confirm-password-error-msg') as HTMLParagraphElement


type Step = 'email' | 'code' | 'new-password'
let currentStep: Step = 'email'
let userData = {
    fullName: '',
    email: '',
    password: ''
}
const currentUserData = await getCurrentUserData()
if (currentUserData) {
    userData = currentUserData
}

function showError(step: string, message: string) {
    hideAllErrors()
    
    switch (step) {
        case 'email':
            emailErrorMsg.innerHTML = message
            emailErrorMsg.style.display = 'inline'
            break
        case 'code':
            codeErrorMsg.innerHTML = message
            codeErrorMsg.style.display = 'inline'
            break
        case 'new-password':
            newPasswordErrorMsg.innerHTML = message
            newPasswordErrorMsg.style.display = 'inline'
            break
        case 'confirm-password':
            confirmPasswordErrorMsg.innerHTML = message
            confirmPasswordErrorMsg.style.display = 'inline'
            break
    }
}

function showConfirmPasswordError(message: string) {
    confirmPasswordErrorMsg.textContent = message
    confirmPasswordErrorMsg.style.display = 'inline'
}

function hideAllErrors() {
    emailErrorMsg.style.display = 'none'
    codeErrorMsg.style.display = 'none'
    newPasswordErrorMsg.style.display = 'none'
    confirmPasswordErrorMsg.style.display = 'none'
}

// Step Management
function showEmailStep() {
    currentStep = 'email'

    titleElement.textContent = 'Reset Password'
    emailContainer.style.display = 'block'
    codeContainer.style.display = 'none'
    newPasswordContainer.style.display = 'none'
    backButton.style.display = 'none'
    
    continueButton.innerHTML = 'Continue <i class="fa-solid fa-arrow-right" style="margin-left: 5px;"></i>'
    
    emailInput.focus()
    hideAllErrors()
    console.log('Showing email step')
}

function showCodeStep() {
    currentStep = 'code'
    
    emailContainer.style.display = 'none'
    codeContainer.style.display = 'block'
    newPasswordContainer.style.display = 'none'
    backButton.style.display = 'inline-flex'
    
    infoTextElement.textContent = `A password reset email has been sent to ${userData.email}. Please check your inbox (and spam folder) for the code.`
    continueButton.innerHTML = 'Continue <i class="fa-solid fa-arrow-right" style="margin-left: 5px;"></i>'
    
    codeInput.focus()
    hideAllErrors()
}

function showNewPasswordStep() {
    currentStep = 'new-password'
    
    titleElement.textContent = 'Create New Password'
    emailContainer.style.display = 'none'
    codeContainer.style.display = 'none'
    newPasswordContainer.style.display = 'block'
    backButton.style.display = 'none'
    
    infoTextElement.textContent = `Create a new, strong password for your account associated with ${userData.email}.`
    continueButton.innerHTML = 'Reset Password'
    
    newPasswordInput.focus()
    hideAllErrors()
}

// Step Handlers
async function handleEmailStep() {
    const email = emailInput.value
    
    hideAllErrors()

    if (!email) {
        showError('email', 'Please enter your email address')
        emailInput.focus()
        return
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = email.trim().toLowerCase();

    if (!emailRegex.test(cleanEmail)) {
        showError('email', 'Please enter a valid email address')
        return
    }

    userData.email = cleanEmail
    showCodeStep()
    await sendResetEmail()
}

async function sendResetEmail() {
    try {
        const response = await fetch('/api/account/reset-password/send', {
            method: 'POST',
            headers: {
            'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: userData.email })
        })

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}))
            showError('email', errorData.message || 'Failed to send reset email. Please try again.')
            return
        }
    } catch (err) {
        console.error('Failed to send reset email:', err)
        showError('email', 'An error occurred while sending the reset email. Please try again.')
    }
}

async function handleCodeStep() {
    const code = codeInput.value.trim()
    // Update the subheader with instructions for the code step
    const subheaderElement = document.querySelector('.subheader') as HTMLElement | null
    if (subheaderElement) {
        subheaderElement.textContent = 'Enter the code sent to your email address to continue.'
    }
    hideAllErrors()
    
    // Verify the OTP code
    const { error } = await supabase.auth.verifyOtp({
        email: userData.email,
        token: code,
        type: 'recovery',
    })
    
    if (error) {
        showError('code', 'Invalid or expired code. Please try again.')
        codeInput.focus()
        return
    }
    
    showNewPasswordStep()
}


async function handlePasswordStep() {
    const password = newPasswordInput.value
    const confirmPassword = confirmPasswordInput.value
    
    hideAllErrors()
    
    if (!password) {
        showError('new-password', 'Please enter a password')
        newPasswordInput.focus()
        return
    }
    
    const passwordRequirements: string | boolean = checkPasswordRequirements(password) || false;

    if (typeof passwordRequirements === 'string') {
        showError('new-password', String(passwordRequirements))
        newPasswordInput.focus()
        return
    }
    
    if (!confirmPassword) {
        showConfirmPasswordError('Please confirm your password')
        confirmPasswordInput.focus()
        return
    }
    
    if (password !== confirmPassword) {
        showConfirmPasswordError('Passwords do not match')
        confirmPasswordInput.focus()
        return
    }
    
    try {
        const { error } = await supabase.auth.updateUser({
            password: password
        })
        
        if (error) {
            showError('new-password', error.message || 'Failed to reset password. Please try again.')
            return
        }
        
        window.location.href = '/account/login?reset=success'
    } catch (err) {
        console.error('Password reset failed:', err)
        showError('new-password', 'An error occurred. Please try again.')
    }
}

async function handleContinue() {
    console.log('Continue button pressed at step:', currentStep)
    switch (currentStep) {
        case 'email':
            await handleEmailStep()
            break
        case 'code':
            await handleCodeStep()
            break
        case 'new-password':
            await handlePasswordStep()
            break
    }
}

function handleBack() {
    showEmailStep()
}

isAuthenticated().then(authenticated => {
    if (authenticated) {
        showNewPasswordStep()
        return
    }
    showEmailStep()
})

continueButton.addEventListener('click', async () => {
    switch (currentStep) {
        case 'email':
            await handleEmailStep()
            break
        case 'code':
            await handleCodeStep()
            break
        case 'new-password':
            await handlePasswordStep()
            break
    }
})

backButton.addEventListener('click', () => {
    switch (currentStep) {
        case 'code':
            showEmailStep()
            break
        case 'new-password':
            showCodeStep()
            break
    }
})

emailInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && currentStep === 'email') {
        handleEmailStep()
    }
})

codeInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && currentStep === 'code') {
        handleCodeStep()
    }
})

newPasswordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && currentStep === 'new-password') {
        handlePasswordStep()
    }
})

confirmPasswordInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && currentStep === 'new-password') {
        handlePasswordStep()
    }
})

backButton.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleBack()
    }
})

continueButton.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        handleContinue()
    }
})

emailInput.addEventListener('input', hideAllErrors)
codeInput.addEventListener('input', hideAllErrors)
newPasswordInput.addEventListener('input', hideAllErrors)
confirmPasswordInput.addEventListener('input', hideAllErrors)