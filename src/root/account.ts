import { createClient } from '@supabase/supabase-js'
import 'blockly/blocks';
import { getProjects } from './serialization';

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

export async function getFromDatabase(tableName: string, objectId: string, column?: string) {
    try {
        const selectOption = column && column.trim().length > 0 ? column : '*';
        const { data, error } = await supabase
            .from(tableName)
            .select(selectOption)
            .eq('id', objectId);

        if (error) {
            console.error('Database retrieval error:', error)
            throw error
        }

        if (!data || data.length === 0) return null;
        return column ? data[0][column] : data[0];
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

export async function appendToDatabase(tableName: string, objectId: string, column: string, value: any) {
	const current = await getFromDatabase(tableName, objectId, column);
	const arr = Array.isArray(current) ? current : [];
	const updated = [...arr, value];
	return await writeToDatabase(tableName, objectId, column, updated, true);
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

export async function updateProjectData(project_id: string, project_data: any) {
    const now = new Date().toISOString();
    let payload: string;

    if (typeof project_data === 'string') {
        payload = project_data;
    } else {
        console.warn('updateProjectData not JSON string');
    }

    await writeToDatabase('projects', project_id, 'project_data', payload, true);
    await writeToDatabase('projects', project_id, 'last_updated', now, true);
}

function normaliseSnapshot(pd) {
    if (pd?.workspace) return pd.workspace; // Normalize workspace data
    if (pd?.blocks?.blocks) return { blocks: pd.blocks.blocks, variables: pd.blocks.variables ?? [] }; // Normalize blocks data
    if (pd?.blocks?.languageVersion || pd?.blocks?.blocks) return { blocks: pd.blocks }; // Normalize legacy blocks data
    return null;
}

export async function loadProjectData(uuid: string) {
    if (!isValidUUID(uuid)) return null;

    const raw = await getFromDatabase('projects', uuid, 'project_data'); // Retrieve raw project data
    const pd = typeof raw === 'string' ? JSON.parse(raw) : raw; // Parse JSON if it's a string
    if (!pd) return null; // If no data, return null

    const snapshot = normaliseSnapshot(pd);
    if (!snapshot?.blocks) { // If no blocks in snapshot, return null
        console.error('No workspace snapshot in project_data');
        return null;
    }

    try {
        const blockly = await import('blockly/core'); // Import Blockly dynamically
        const ws = blockly.getMainWorkspace?.() || blockly.common?.getMainWorkspace?.(); // Get the main workspace

        if (ws && blockly.serialization?.workspaces?.load) { // If workspace and serialization are available
            try {
                ws.clear(); // Clear the workspace before loading
                const loadPayload = snapshot.blocks?.blocks ? { blocks: snapshot.blocks } : snapshot; // Load the blocks data
                blockly.serialization.workspaces.load(loadPayload, ws); // Load the workspace data
            } catch (e) {
                console.warn('Failed to deserialize workspace snapshot', e);
            }
        }

        return ws ?? null; // Return the workspace or null if not available
    } catch {
        return null;
    }
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

// Sync cloud projects owned by the current user into local storage (placeholder entries) if not already present.
export async function syncCloudProjects(userId?: string) {
    try {
        if (!userId) return; // If logged in no cloud projects, return early
        const remoteIds = await findUserProjects(userId); 
        if (!remoteIds || remoteIds.length === 0) return; // If no remote projects, return early
        const projects = getProjects();
        let changed = false; // Flag to track if any changes were made
        for (const id of remoteIds) {
            if (!projects[id]) { // If project not in local storage, add it
                let name = await getFromDatabase('projects', id, 'name') as string | null; // Fetch project name from database
                if (!name) name = 'unnamed project';
                projects[id] = { name, time: dayjs(), workspace: {}, thumbnail: "" } as Project; // Create project entry
                changed = true; // Set changed flag to true
            }
        }
        if (changed) {
            localStorage.setItem("roboxProjects", JSON.stringify(projects)); // Save updated projects to local storage
        }
    } catch (e) {
        console.warn("Cloud project sync failed", e);
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

export async function getProjectSyncStatus(uuid: string) {
    if (!isValidUUID(uuid)) {
        return false;
    }
    if (await getFromDatabase('projects', uuid, 'cloud_sync') === true) {
        return true;
    }
    return false;
}

export async function findUserProjects(userId: string): Promise<string[]> {
    if (!isValidUUID(userId)) {
        console.warn('Invalid user ID:', userId);
        return [];
    }
    try {
        const { data, error } = await supabase
            .from('projects')
            .select('id')
            .eq('owner', userId);

        if (error) {
            console.error('Error finding user projects:', error);
            return [];
        }
        return (data ?? []).map(p => p.id as string);
    } catch (error) {
        console.error('Unexpected error during user project retrieval:', error);
        return [];
    }
}

export async function createClassroom(data): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    const ownerId = session?.user?.id;
    if (!ownerId) {
        console.error('No authenticated user found');
        return null;
    }

    // Add to classrooms table
    const row = {
        owner: ownerId,
        name: data.name,
        description: data.description,
        year_level: data.year_level,
        class_code: data.class_code,
        location: data.location,
        lms_url: data.lms_url,
        security: data.security,
        features: data.features,
        status: 'active',
    };

    let classroomId: string | null = null;

    try {
        const { data: inserted, error } = await supabase
            .from('classrooms')
            .insert(row)
            .select('id')
            .single();

        if (error) {
            console.error('Failed to create classroom:', error);
            throw error;
        }

        classroomId = inserted?.id ?? null;
    } catch (error) {
        console.error('Error creating classroom:', error);
        throw error;
    }

    if (classroomId) {
        await appendToDatabase('profiles', ownerId, 'classrooms', classroomId);
    }

    return classroomId;
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