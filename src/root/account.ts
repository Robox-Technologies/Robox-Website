import { createClient } from '@supabase/supabase-js'

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

export async function authCheck() {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
        console.error('Auth error:', error)
        redirectToLogin()
        return false
    }
    
    if (!session) {
        console.warn('No active session found')
        redirectToLogin()
        return false
    }

    return true
}

export function redirectToLogin() {
    window.location.href = "/account/login"
}

export async function getCurrentUserData() {
    try {
        const { data: { user }, error } = await supabase.auth.getUser()

        if (error) {
            console.error('Error getting user data:', error)
            return null
        }
        return user
        
    } catch (error) {
        console.error('Failed to get user data:', error)
        return null
    }
}

export async function isAuthenticated() {
    try {
        const { data: { session } } = await supabase.auth.getSession()
        return !!session
    } catch (error) {
        console.error('Auth check failed:', error)
        return false
    }
}

export async function signIn(email: string, password: string) {
    try {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        
        if (error) {
            console.error('Sign in error:', error)
            throw error
        }

    } catch (error) {
        console.error('Sign in failed:', error)
        throw error
    }
}

export async function signOut(redirectTo: string = '/') {
    try {
        await supabase.auth.signOut()
        window.location.href = redirectTo
    } catch (error) {
        console.error('Sign out error:', error)
        window.location.href = redirectTo
    }
}

export function headerAuth() {
    const updateHeaderAuthState = async () => {
        const loginButton = document.getElementById('header-login-button') as HTMLButtonElement
        const accountButton = document.getElementById('header-loggedin-button') as HTMLButtonElement
        const usernameElement = document.getElementById('header-username') as HTMLDivElement
        
        if (await isAuthenticated()) {
            loginButton.style.display = 'none'
            accountButton.style.display = 'inline-flex'
            
            const userData = await getCurrentUserData()
            const fullName = userData?.user_metadata?.full_name
            const displayName = fullName.includes(' ') ? fullName.split(' ')[0] + ' ' + fullName.split(' ')[1]?.charAt(0) : fullName
            usernameElement.textContent = displayName || userData?.email || 'User'
        } else {
            loginButton.style.display = 'inline-flex'
            accountButton.style.display = 'none'
            usernameElement.textContent = ''
        }
    }

    document.addEventListener('DOMContentLoaded', async () => {
        await updateHeaderAuthState()
    })
}

export async function isValidEmail(email: string): Promise<boolean | string> {
    console.log('Checking if email is valid:', email);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = email.trim().toLowerCase();

    if (!emailRegex.test(cleanEmail)) {
        console.log('Invalid email format:', cleanEmail);
        return 'Please enter a valid email address';
    }

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('email')
            .eq('email', cleanEmail);

        console.log('Email check result:', { query: cleanEmail, data, error });

        if (data && data.length > 0) {
            return true;
        }

        if (error) {
            console.error('Supabase error:', error);
            return 'Please try again later.';
        }

        return false;
        
    } catch (err) {
        console.error('Unexpected error during email validation:', err);
        return 'Unable to validate email';
    }
}