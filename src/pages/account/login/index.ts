import { createClient } from '@supabase/supabase-js'
import { isAuthenticated } from '@root/account'

const supabaseUrl = process.env.PUBLIC_SUPABASE_URL
const supabaseKey = process.env.PUBLIC_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables')
}

const supabase = createClient(supabaseUrl, supabaseKey)

const titleElement = document.querySelector('h1.title') as HTMLHeadingElement
const emailInput = document.getElementById('email') as HTMLInputElement
const passwordInput = document.getElementById('password') as HTMLInputElement
const emailContainer = document.querySelector('.email-container') as HTMLDivElement
const passwordContainer = document.querySelector('.password-container') as HTMLDivElement
const emailErrorMsg = document.getElementById('email-error-msg') as HTMLParagraphElement
const passwordErrorMsg = document.getElementById('password-error-msg') as HTMLParagraphElement
const loginButton = document.getElementById('login-button') as HTMLButtonElement
const backButton = document.getElementById('back-button') as HTMLButtonElement

let currentStep: 'email' | 'password' = 'email'
let userEmail = ''

function showError(message: string) {
    if (currentStep === 'email') {
        emailErrorMsg.textContent = message
        emailErrorMsg.style.display = 'inline'
    } else {
        passwordErrorMsg.textContent = message
        passwordErrorMsg.style.display = 'inline'
    }
}

function hideError() {
    emailErrorMsg.style.display = 'none'
    passwordErrorMsg.style.display = 'none'
}

function isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    return emailRegex.test(email)
}

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

async function handleEmailStep() {
    const email = emailInput.value.trim()
    
    console.log("running email step")

    hideError()
    
    if (!email) {
        showError('Please enter your email address')
        return
    }
    
    if (!isValidEmail(email)) {
        showError('Please enter a valid email address')
        return
    }
    
    loginButton.disabled = true
    
    try {
        userEmail = email
        showPasswordStep()
        
    } catch (error: any) {
        console.error('Email check error:', error)
        showError('An error occurred. Please try again.')
    } finally {
        loginButton.disabled = false
    }
}

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
        const { data, error } = await supabase.auth.signInWithPassword({
            email: userEmail,
            password: password
        })
        
        if (error) {
            throw error
        }
        
        window.location.href = '/home'
        
    } catch (error: any) {
        console.error('Login error:', error)

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

async function handleLogin() {
    if (currentStep === 'email') {
        await handleEmailStep()
    } else {
        await handlePasswordStep()
    }
}

function handleBack() {
    showEmailStep()
    userEmail = ''
}

isAuthenticated().then(authenticated => {
    if (authenticated) {
        window.location.href = '/home'
    }
})

document.addEventListener('DOMContentLoaded', () => {
    loginButton.addEventListener('click', handleLogin)
    
    if (backButton) {
        backButton.addEventListener('click', handleBack)
    }
    
    emailInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && currentStep === 'email') {
            handleLogin()
        }
    })
    
    passwordInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && currentStep === 'password') {
            handleLogin()
        }
    })
    
    emailInput.addEventListener('input', hideError)
    passwordInput.addEventListener('input', hideError)
    
    showEmailStep()
})