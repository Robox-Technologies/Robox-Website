import { createClient } from '@supabase/supabase-js'
import { isAuthenticated, isValidEmail } from '@root/account'

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

function isValidPassword(password: string): boolean {
    return password.length >= 6
}

// Step Management
function showUserTypeStep() {
    currentStep = 'user-type'
    
    titleElement.textContent = 'Sign Up'
    userTypeContainer.style.display = 'block'
    personalInfoContainer.style.display = 'none'
    passwordContainer.style.display = 'none'
    backButton.style.display = 'none'
    
    signupButton.innerHTML = 'Continue <i class="fa-solid fa-arrow-right" style="margin-left: 5px;"></i>'
    
    hideAllErrors()
}

function showPersonalInfoStep() {
    currentStep = 'personal-info'
    
    userTypeContainer.style.display = 'none'
    personalInfoContainer.style.display = 'block'
    passwordContainer.style.display = 'none'
    backButton.style.display = 'inline-flex'
    
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
    
    const emailExists = await isValidEmail(email)
    
    if (emailExists === false) {
        userData.fullName = nameGenerator(firstName, lastName)
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
        console.error('Unexpected return type from isValidEmail:', emailExists)
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
    
    if (!isValidPassword(password)) {
        showError('password', 'Password must be at least 6 characters long')
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

function nameGenerator(firstName: string, lastName: string) {
    const name: string = {
        fullName: `${firstName.trim()} ${lastName.trim()}`,
        displayName: `${firstName.trim()} ${lastName.trim().charAt(0)}`
    }
    return name

}

async function createAccount() {
    signupButton.disabled = true
    signupButton.innerHTML = 'Nearly there!'

    let userNames: { fullName: string, displayName: string } = nameGenerator(firstNameInput.value, lastNameInput.value)

    try {
        const { data, error: authError } = await supabase.auth.signUp({
            email: userData.email,
            password: userData.password,
            options: {
                data: {
                    full_name: userNames.fullName,
                    display_name: userNames.displayName
                }
            }
        })
        
        if (authError) {
            throw authError
        }
        
        if (!authError) {
            const { error: dbError } = await supabase
                .from('profiles')
                .insert({
                    id: data.user.id,
                    first_name: firstNameInput.value,
                    last_name: lastNameInput.value,
                    display_name: userNames.displayName,
                    full_name: userNames.fullName,
                    email: userData.email,
                    user_role: userType,
                    created_at: new Date()
                })
            
            if (dbError) {
                console.error('Error saving user data:', dbError)
            }
        }

        if (userType == 'teacher' && !authError) {
            window.location.href = 'classroom/create'
        }
        else if (userType == 'student' && !authError) {
            window.location.href = 'classroom/join'
        }
        else {
            alert('Failed to create account')
        }
        
    } catch (error) {
        console.error('Signup error:', error)
        
        if (error.message.includes('User already registered')) {
            showError('personal-info', 'An account with this email already exists')
            showPersonalInfoStep()
        } else if (error.message.includes('Invalid email')) {
            showError('personal-info', 'Please enter a valid email address')
            showPersonalInfoStep()
        } else {
            showError('password', error.message || 'An error occurred during signup')
        }
        
        signupButton.disabled = false
        signupButton.innerHTML = 'Create Account <i class="fa-solid fa-arrow-right" style="margin-left: 5px;"></i>'
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
}

isAuthenticated().then(authenticated => {
    if (authenticated) {
        window.location.href = '/home'
    }
})


document.addEventListener('DOMContentLoaded', () => {
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
