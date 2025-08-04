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
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) {
            console.error('Failed to get session:', sessionError)
            return null
        }
        if (!session?.user?.id) {
            console.warn('No user ID found in session')
            return null
        }
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', session.user.id)
            .single()

        if (error) {
            console.error('Failed to get user data:', error)
            return null
        }
        return data
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

export async function deleteAccount() {
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) {
        console.error('No active session found')
        return
    }

    const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })

    const result = await res.json()
    if (res.ok) {
        console.log('Account deleted successfully')
    } else {
        console.error('Failed to delete account:', result.error || 'Unknown error')
    }
}

export async function getFromDatabase(tableName: string, objectId: string, row: string) {
    try {
        const { data, error } = await supabase
            .from(tableName)
            .select()
            .eq('id', objectId)

        if (error) {
            console.error('Database retrieval error:', error)
            throw error
        }

        return data && data.length > 0 ? data[0][row] : null
    } catch (error) {
        console.error('Failed to retrieve data from database:', error)
        throw error
    }
}

export async function writeToDatabase(tableName: string, objectId: string, column: string, value: any, overwrite: boolean = true) {
    try {
        let data, error;
        if (overwrite) {
            ({ data, error } = await supabase
                .from(tableName)
                .update({ [column]: value })
                .eq('id', objectId)
                .select());
        } else {
            ({ data, error } = await supabase
                .from(tableName)
                .upsert({ id: objectId, [column]: value }, { onConflict: 'id' })
                .select());
        }
        if (error) {
            console.error('Database update error:', error)
            throw error;
        }
        return data && data.length > 0 ? data[0] : null
    } catch (error) {
        console.error('Failed to update data in database:', error)
        throw error
    }
}

function isProtoPollution(key: string): boolean {
    const forbiddenKeys = ["__proto__", "constructor", "prototype"];
    return forbiddenKeys.includes(key);
}

export function isValidUUID(uuid: string): boolean {
    if (isProtoPollution(uuid)) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

export async function updateProjectData(project_id: string, project_data: string) {
    const now = new Date().toISOString();
    await writeToDatabase('projects', project_id, 'project_data', project_data, true);
    await writeToDatabase('projects', project_id, 'last_updated', now, true);
}

export async function isSyncedProject(uuid: string): Promise<boolean> {
    if (!isValidUUID(uuid)) {
        console.warn('Invalid UUID:', uuid);
        return false;
    }
    try {
        const { data, error } = await supabase
            .from('projects')
            .select('cloud_sync')
            .eq('id', uuid)
            .maybeSingle();
        if (error) {
            return false;
        }
        if (!data) {
            return false;
        }
        return !!(data && data.cloud_sync === true);
    } catch (error) {
        return false;
    }
}

export async function deleteCloudProject(uuid: string) {
    if (!isValidUUID(uuid)) {
        console.warn('Invalid UUID:', uuid);
        return;
    }
    try {
        const { error } = await supabase
            .from('projects')
            .delete()
            .eq('id', uuid);
        if (error) {
            console.error('Failed to delete cloud project:', error);
            throw error;
        }
    } catch (error) {
        console.error('Error deleting cloud project:', error);
        throw error;
    }
}

export async function uploadNewProject(projectId: string, userId: string, name: string) {
    const defaultProjectName: string = 'unnamed project'

    name = name || defaultProjectName;
    console.log(userId, projectId)

    try {
        const { data, error } = await supabase
            .from('projects')
            .insert({
                id: projectId,
                owner: userId,
                name: name,
                status: 'active',
                cloud_sync: true
            })
            .select();

        if (error) {
            console.error('Project creation error:', error)
            throw error;
        }

        return data && data.length > 0 ? data[0] : null;
    }
    catch (error) {
        console.error('Failed to create project:', error)
        throw error
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
            const displayName = userData.display_name
            const firstName = userData?.first_name
            const email = userData?.full_name
            usernameElement.textContent = displayName || firstName || email || 'User'
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