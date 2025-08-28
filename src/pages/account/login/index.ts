import { createClient } from '@supabase/supabase-js'
import { authCheck, isValidEmail } from '@root/account'

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

// create a client instance to call auth methods supabase stuff
const supabase = createClient(supabaseUrl, supabaseKey)

// get page elements and put them in variables for easy access
const titleElement = document.querySelector('h1.title') as HTMLHeadingElement
const emailInput = document.getElementById('email') as HTMLInputElement
const passwordInput = document.getElementById('password') as HTMLInputElement
const emailContainer = document.querySelector('.email-container') as HTMLDivElement
const passwordContainer = document.querySelector('.password-container') as HTMLDivElement
const emailErrorMsg = document.getElementById('email-error-msg') as HTMLParagraphElement
const passwordErrorMsg = document.getElementById('password-error-msg') as HTMLParagraphElement
const loginButton = document.getElementById('login-button') as HTMLButtonElement
const backButton = document.getElementById('back-button') as HTMLButtonElement

// currentStep can only be 'email' or 'password'
// userEmail is a plain string to hold the email
let currentStep: 'email' | 'password' = 'email'
let userEmail = ''

// check for people who are already logged in get redirected
authCheck('guest', true)

// show an inline message next to the current input area
function showError(message: string) {
    if (currentStep === 'email') {
        emailErrorMsg.innerHTML = message
        emailErrorMsg.style.display = 'inline'
    } else {
        passwordErrorMsg.innerHTML = message
        passwordErrorMsg.style.display = 'inline'
    }
}

// hide all error messages
function hideError() {
    emailErrorMsg.style.display = 'none'
    passwordErrorMsg.style.display = 'none'
}

// switch the UI to the password step
function showPasswordStep() {
    currentStep = 'password'

    titleElement.textContent = 'Enter Password'
    emailContainer.style.display = 'none'
    passwordContainer.style.display = 'block'
    backButton.style.display = 'inline-flex'
    
    loginButton.innerHTML = 'Sign In <i class="fa-solid fa-arrow-right" style="margin-left: 20px;"></i>'
    
    passwordInput.focus()
    
    hideError()
}

// switch back to the email step when the user wants to change their email
function showEmailStep() {
    currentStep = 'email'
    
    titleElement.textContent = 'Welcome Back!'
    emailContainer.style.display = 'block'
    passwordContainer.style.display = 'none'
    backButton.style.display = 'none'
    
    loginButton.innerHTML = 'Continue <i class="fa-solid fa-arrow-right" style="margin-left: 20px;"></i>'
    
    emailInput.focus()
    
    hideError()
}

// handle the first step where we verify the email exists on the server
async function handleEmailStep() {
    const email = emailInput.value.trim()
    hideError()
    
    if (!email) {
        showError('Please enter your email address')
        return
    }
    
    const emailExists = await isValidEmail(email)
    // if the email exists, move to the password step
    if (emailExists === true) {
        userEmail = email
        showPasswordStep()
        return
    }
    if (emailExists === false) {
        showError('An account with this email does not exist. Please <a href="/account/signup" class="error-link">sign up</a> first.')
        return
    }
    if (typeof emailExists === 'string') {
        showError(emailExists)
        return
    }
    else {
        console.error('Unexpected return type from isValidEmail:', emailExists)
        showError('An unexpected error occurred. Please try again.')
        return
    }
}

// attempt sign in with the collected email and the entered password
async function handlePasswordStep() {
    const password = passwordInput.value
    
    hideError()
    
    if (!password) {
        showError('Please enter your password')
        return
    }
    
    loginButton.disabled = true
    loginButton.innerHTML = 'Signing in... <i class="fa-solid fa-spinner fa-spin" style="margin-left: 20px;"></i>'
    
    try {
        // use supabase to sign in with email and password
        const { data, error } = await supabase.auth.signInWithPassword({
            email: userEmail,
            password: password
        })
        
        if (error) {
            throw error
        }
        
        window.location.href = '/student'
        
    } catch (error: any) {
        // show error messages based on common issues
        if (error.message.includes('Invalid login credentials')) {
            showError('Incorrect password. Please try again.')
        } else if (error.message.includes('Email not confirmed')) {
            showError('Please check your email and confirm your account first.')
        } else {
            showError(error.message || 'An error occurred during login')
        }
        
        loginButton.disabled = false
        loginButton.innerHTML = 'Sign In <i class="fa-solid fa-arrow-right" style="margin-left: 20px;"></i>'
    }
}

// handler that decides which step to run based on the currentStep value
async function handleLogin() {
    if (currentStep === 'email') {
        await handleEmailStep()
    } else {
        await handlePasswordStep()
    }
}

// do this when user presses back
function handleBack() {
    showEmailStep()
    userEmail = ''
}

// UI events to make the user experience better
document.addEventListener('DOMContentLoaded', () => {
    loginButton.addEventListener('click', handleLogin)
    
    if (backButton) {
        backButton.addEventListener('click', handleBack)
    }
    
    // on enter key press on the email step, trigger the login action
    emailInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && currentStep === 'email') {
            handleLogin()
        }
    })
    // on enter key press on the email step, trigger the login action
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && currentStep === 'password') {
            handleLogin()
        }
    })
    
    // hide error messages when user starts typing again
    emailInput.addEventListener('input', hideError)
    passwordInput.addEventListener('input', hideError)
    
    showEmailStep()
})