import { createClient } from '@supabase/supabase-js'
import { isAuthenticated, checkEmailAvailability, checkPasswordRequirements } from '@root/account'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey)

// Containers
const titleElement = document.querySelector('h1.title') as HTMLHeadingElement
const userTypeContainer = document.querySelector('.user-type-container') as HTMLDivElement
const personalInfoContainer = document.querySelector('.personal-info-container') as HTMLDivElement
const passwordContainer = document.querySelector('.password-container') as HTMLDivElement
// Inputs and Buttons
const studentButton = document.getElementById('student-button') as HTMLButtonElement
const teacherButton = document.getElementById('teacher-button') as HTMLButtonElement
const firstNameInput = document.getElementById('first-name') as HTMLInputElement
const lastNameInput = document.getElementById('last-name') as HTMLInputElement
const emailInput = document.getElementById('email') as HTMLInputElement
const passwordInput = document.getElementById('password') as HTMLInputElement
const confirmPasswordInput = document.getElementById('confirm-password') as HTMLInputElement
const signupButton = document.getElementById('signup-button') as HTMLButtonElement
const backButton = document.getElementById('back-button') as HTMLButtonElement
// Error Messages 
const userTypeErrorMsg = document.getElementById('user-type-error-msg') as HTMLParagraphElement
const firstNameErrorMsg = document.getElementById('first-name-error-msg') as HTMLParagraphElement
const lastNameErrorMsg = document.getElementById('last-name-error-msg') as HTMLParagraphElement
const emailErrorMsg = document.getElementById('email-error-msg') as HTMLParagraphElement
const passwordErrorMsg = document.getElementById('password-error-msg') as HTMLParagraphElement
const confirmPasswordErrorMsg = document.getElementById('confirm-password-error-msg') as HTMLParagraphElement

type Step = 'user-type' | 'personal-info' | 'password'
let currentStep: Step = 'user-type'
let userType: 'student' | 'teacher' | null = null
let userData = {
    fullName: '',
    email: '',
    password: ''
}

function showError(step: string, message: string) {
    hideAllErrors()
    
    switch (step) {
        case 'user-type':
            userTypeErrorMsg.innerHTML = message
            userTypeErrorMsg.style.display = 'inline'
            break
        case 'first-name':
            firstNameErrorMsg.innerHTML = message
            firstNameErrorMsg.style.display = 'inline'
            break
        case 'last-name':
            lastNameErrorMsg.innerHTML = message
            lastNameErrorMsg.style.display = 'inline'
            break
        case 'email':
            emailErrorMsg.innerHTML = message
            emailErrorMsg.style.display = 'inline'
            break
        case 'password':
            passwordErrorMsg.innerHTML = message
            passwordErrorMsg.style.display = 'inline'
            break
    }
}

function showConfirmPasswordError(message: string) {
    confirmPasswordErrorMsg.textContent = message
    confirmPasswordErrorMsg.style.display = 'inline'
}

function hideAllErrors() {
    userTypeErrorMsg.style.display = 'none'
    firstNameErrorMsg.style.display = 'none'
    lastNameErrorMsg.style.display = 'none'
    emailErrorMsg.style.display = 'none'
    passwordErrorMsg.style.display = 'none'
    confirmPasswordErrorMsg.style.display = 'none'
}

// Step Management
function showUserTypeStep() {
    currentStep = 'user-type'
    
    titleElement.textContent = 'Sign Up'
    userTypeContainer.style.display = 'block'
    personalInfoContainer.style.display = 'none'
    passwordContainer.style.display = 'none'
    backButton.style.display = 'none'
    signupButton.style.display = 'none'
    
    signupButton.innerHTML = 'Continue <i class="fa-solid fa-arrow-right" style="margin-left: 5px;"></i>'
    
    hideAllErrors()
}

function showPersonalInfoStep() {
    currentStep = 'personal-info'
    
    userTypeContainer.style.display = 'none'
    personalInfoContainer.style.display = 'block'
    passwordContainer.style.display = 'none'
    backButton.style.display = 'inline-flex'
    signupButton.style.display = 'block'
    
    signupButton.innerHTML = 'Continue <i class="fa-solid fa-arrow-right" style="margin-left: 5px;"></i>'
    
    firstNameInput.focus()
    hideAllErrors()
}

function showPasswordStep() {
    currentStep = 'password'
    
    titleElement.textContent = 'Create Password'
    userTypeContainer.style.display = 'none'
    personalInfoContainer.style.display = 'none'
    passwordContainer.style.display = 'block'
    backButton.style.display = 'inline-flex'
    
    signupButton.innerHTML = 'Create Account <i class="fa-solid fa-arrow-right" style="margin-left: 5px;"></i>'
    
    passwordInput.focus()
    hideAllErrors()
}

// Step Handlers
async function handleUserTypeStep() {
    if (!userType) {
        showError('user-type', 'Please select whether you are a student or teacher')
        return
    }
    
    showPersonalInfoStep()
}

async function handlePersonalInfoStep() {
    const firstName = firstNameInput.value.trim()
    const lastName = lastNameInput.value.trim()
    const email = emailInput.value.trim()
    
    hideAllErrors()

    if (!firstName) {
        showError('first-name', 'Please enter your first name')
        firstNameInput.focus()
        return
    }

    if (!lastName) {
        showError('last-name', 'Please enter your last name')
        lastNameInput.focus()
        return
    }

    if (!email) {
        showError('email', 'Please enter your email address')
        emailInput.focus()
        return
    }
    
    const emailExists = await checkEmailAvailability(email)
    
    if (emailExists === false) {
        userData.email = email
        showPasswordStep()
        return
    }
    if (emailExists === true) {
        showError('email', 'An account with this email already exists. Please <a href="/account/login" class="error-link">log in</a>.')
        return
    }
    if (typeof emailExists === 'string') {
        showError('email', emailExists)
        return
    }
    else {
        showError('email', 'An unexpected error occurred. Please try again.')
        return
    }
}

async function handlePasswordStep() {
    const password = passwordInput.value
    const confirmPassword = confirmPasswordInput.value
    
    hideAllErrors()
    
    if (!password) {
        showError('password', 'Please enter a password')
        passwordInput.focus()
        return
    }
    
    const passwordRequirements: string | boolean = checkPasswordRequirements(password) || false;

    if (typeof passwordRequirements === 'string') {
        showError('password', String(passwordRequirements))
        passwordInput.focus()
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
    
    userData.password = password
    
    await createAccount()
}

async function createAccount() {
    signupButton.disabled = true
    signupButton.innerHTML = 'Nearly there!'

    const payload = {
        email: userData.email,
        password: userData.password,
        firstName: firstNameInput.value.trim(),
        lastName: lastNameInput.value.trim(),
        userType
    }

    try {
        const resp = await fetch('/api/account/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })

        const result = await resp.json().catch(() => ({}))

        if (!resp.ok) {
            const errMsg = (result && (result.error?.message || result.error || result.message)) || 'An error occurred during signup.'
            if (String(errMsg).includes('User already registered')) {
                showError('personal-info', 'An account with this email already exists')
                showPersonalInfoStep()
            } else if (String(errMsg).includes('Invalid email')) {
                showError('personal-info', 'Please enter a valid email address')
                showPersonalInfoStep()
            } else {
                showError('password', String(errMsg))
            }
            return
        }

        // success path: sign in the new user
        if (result && result.success) {
            try {
                const { error: verifyOtpError } = await supabase.auth.verifyOtp({
                    token_hash: result.magicCode,
                    type: 'email',
                })

                if (verifyOtpError) {
                    console.error('Auto sign-in failed:', verifyOtpError)
                    // If sign-in fails
                    window.location.href = result.redirect || '/account/login'
                    return
                }

                // Signed in successfully
                window.location.href = result.redirect || '/home'
                return
            } catch (err) {
                console.error('Unexpected sign-in error:', err)
                window.location.href = result.redirect || '/account/login'
                return
            }
        }
        showError('password', 'An error occurred during signup. Please try again later.')
    } catch (err: any) {
        console.error('Signup request failed:', err)
        showError('password', err?.message || 'Unable to create account. Please try again later.')
    } finally {
        signupButton.disabled = false
        // restore text for the current step
        if (currentStep === 'password') {
            signupButton.innerHTML = 'Create Account <i class="fa-solid fa-arrow-right" style="margin-left: 5px;"></i>'
        } else {
            signupButton.innerHTML = 'Continue <i class="fa-solid fa-arrow-right" style="margin-left: 5px;"></i>'
        }
    }
}

async function handleSignup() {
    switch (currentStep) {
        case 'user-type':
            await handleUserTypeStep()
            break
        case 'personal-info':
            await handlePersonalInfoStep()
            break
        case 'password':
            await handlePasswordStep()
            break
    }
}

function handleBack() {
    switch (currentStep) {
        case 'personal-info':
            showUserTypeStep()
            break
        case 'password':
            showPersonalInfoStep()
            break
    }
}

function selectUserType(type: 'student' | 'teacher') {
    userType = type

    studentButton.classList.remove('selected')
    teacherButton.classList.remove('selected')

    if (type === 'student') {
        studentButton.classList.add('selected')
    } else {
        teacherButton.classList.add('selected')
    }

    hideAllErrors()
    signupButton.style.display = 'inline-flex'
    showPersonalInfoStep()
}

isAuthenticated().then(authenticated => {
    if (authenticated) {
        window.location.href = '/home'
    }

    signupButton.addEventListener('click', handleSignup)
    backButton.addEventListener('click', handleBack)
    
    studentButton.addEventListener('click', () => selectUserType('student'))
    teacherButton.addEventListener('click', () => selectUserType('teacher'))
    
    firstNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && currentStep === 'personal-info') {
            handleSignup()
        }
    })

    lastNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && currentStep === 'personal-info') {
            handleSignup()
        }
    })
    
    emailInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && currentStep === 'personal-info') {
            handleSignup()
        }
    })
    
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && currentStep === 'password') {
            handleSignup()
        }
    })
    
    confirmPasswordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && currentStep === 'password') {
            handleSignup()
        }
    })
    
    firstNameInput.addEventListener('input', hideAllErrors)
    lastNameInput.addEventListener('input', hideAllErrors)
    emailInput.addEventListener('input', hideAllErrors)
    passwordInput.addEventListener('input', hideAllErrors)
    confirmPasswordInput.addEventListener('input', hideAllErrors)
    
    showUserTypeStep()
})
