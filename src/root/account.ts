import { createClient } from '@supabase/supabase-js'
import 'blockly/blocks';
import { getProjects } from '@root/blockly/serialization';

// Initialize Supabase client
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

export async function authCheck(role: string = 'user', redirect: boolean = true):Promise<boolean | null> {
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
        console.error('Auth error:', error)
        return false
    }

    if (!session) {
        console.warn('No active session found')
        return false
    }

    let userRole: 'student' | 'teacher' | null = null;
    if (role === 'student' || role === 'teacher') {
        if (session) {
            userRole = await getFromDatabase('profiles', session.user.id, 'user_role');
        }
    }

    switch (role) {
        case 'guest':
            if (!session) {
                return true
            }
            if (redirect) {
                window.location.href = '/login'
            }
            return false
        case 'user':
            if (session) {
                return true
            }
            if (redirect) {
                window.location.href = '/student'
            }
            return false
        case 'student':
            if (userRole === 'student') {
                return true
            }
            if (redirect) {
                window.location.href = '/student'
            }
            return false
        case 'teacher':
            if (userRole === 'teacher') {
                return true
            }
            if (redirect) {
                window.location.href = '/student'
            }
            return false
        default:
            return null
    }
}

export function checkPasswordRequirements(password: string): boolean | string {
    // Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.

    const problems: string[] = []

    if (!password || password.length < 8) {
        problems.push("be at least 8 characters long");
    }
    if (!/[A-Z]/.test(password)) {
        problems.push('contain at least one uppercase letter');
    }
    if (!/[a-z]/.test(password)) {
        problems.push('contain at least one lowercase letter');
    }
    if (!/\d/.test(password)) {
        problems.push('contain at least one number');
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        problems.push('contain at least one special character');
    }

    if (problems.length === 0) {
        return true;
    }
    // Make sentence
    let sentence: string = 'Password must ';
    if (problems.length === 1) {
        sentence += problems[0];
    } else if (problems.length === 2) {
        sentence += problems.join(' and ');
    } else {
        const last = problems.pop();
        sentence += problems.join(', ') + ', and ' + last;
    }
    
    return sentence + '.';
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
    let success = true;
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            console.warn('Supabase signOut error:', error);
            success = false;
        }
    } catch (err) {
        console.error('Sign out threw:', err);
        success = false;
    } finally {
        try {
            Object.keys(localStorage)
                .filter(k => k.startsWith('supabase') || k.startsWith('sb-'))
                .forEach(k => localStorage.removeItem(k));
        } catch (err) {
            console.error('Failed to clear localStorage:', err);
        }
        window.location.replace(redirectTo);
    }
    return success;
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

export async function appendToDatabase(tableName: string, objectId: string, column: string, value: any, add: boolean = true) {
	// add: true = add value, false = delete value
	const current = await getFromDatabase(tableName, objectId, column);
	const arr: any[] = Array.isArray(current) ? [...current] : [];

	let updated: any[] = arr;

	if (add) {
		if (value !== undefined && value !== null && !arr.includes(value)) {
			updated = [...arr, value];
		}
	} else {
		updated = arr.filter(v => v !== value);
	}

	if (updated === arr || (updated.length === arr.length && updated.every((v,i)=>v===arr[i]))) {
		return current;
	}

	return await writeToDatabase(tableName, objectId, column, updated, true);
}

export async function removeClassroomFromProfile(classroomId: string, userId: string) {
    try {
        const tryAgain = await getFromDatabase('classrooms', classroomId) as any;
        if (!tryAgain) {
            console.warn(`Classroom with ID ${classroomId} not found, removing from profile.`);
            await appendToDatabase('profiles', userId, 'classrooms', classroomId, false);
        }
        return true;
    } catch (error) {
        console.error(`Failed to remove classroom ${classroomId} from profile ${userId}:`, error);
        return false;
    }
}

export async function getBasicUserData(users: string[] | string): Promise<{ id: string, display_name: string, user_role: string, avatar_url: string }[]> {
    const userIds = Array.isArray(users) ? users : [users];
    const results = await Promise.all(userIds.map(async id => {
        const [display_name, user_role, avatar_url] = await Promise.all([
            getFromDatabase('profiles', id, 'display_name'),
            getFromDatabase('profiles', id, 'user_role'),
            getFromDatabase('profiles', id, 'avatar_url')
        ]);
        return { id, display_name, user_role, avatar_url };
    }));
    return results;
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
        if (!userId) return;
        const remoteIds = await findUserProjects(userId);
        if (!remoteIds || remoteIds.length === 0) return;
        const projects = getProjects();
        let changed = false;
        for (const id of remoteIds) {
            if (!projects[id]) {
                const remoteProject = await getFromDatabase('projects', id);
                const name = (remoteProject && (remoteProject as any).name) ?? 'unnamed project';
                const last_updated = (remoteProject && (remoteProject as any).last_updated) ?? new Date().toISOString();

                const projectDataRaw = remoteProject?.project_data;
                let projectDataParsed: any = null;
                try { projectDataParsed = JSON.parse(projectDataRaw); } catch {}

                const placeholder: {
                    id: string;
                    owner: string;
                    name: string;
                    workspace: Record<string, unknown>;
                    thumbnail: string;
                    last_updated: string;
                } = {
                    id,
                    owner: userId,
                    name,
                    workspace: {},
                    thumbnail: projectDataParsed?.thumbnail || '',
                    last_updated
                };

                projects[id] = placeholder;
                changed = true;
            }
        }
        if (changed) {
            localStorage.setItem("roboxProjects", JSON.stringify(projects));
        }
    } catch (e) {
        console.warn("Cloud project sync failed", e);
    }
}

export async function uploadNewProject(projectId: string, userId: string, name: string) {
    const defaultProjectName: string = 'unnamed project'

    name = name || defaultProjectName;

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
        course_code: data.course_code,
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
        await appendToDatabase('classrooms', classroomId, 'teachers', ownerId);
    }

    return classroomId;
}

export async function isValidClassroom(classroomId: string): Promise<boolean | null> {
    if (!isValidUUID(classroomId)) {
        console.warn('Invalid classroom ID:', classroomId);
        return null;
    }
    const { error } = await supabase
        .from('classrooms')
        .select('*')
        .eq('id', classroomId)
        .single();
    if (error) {
        console.error('Error finding classroom by ID:', error);
        return false;
    }
    return true;
}


export async function getClassroomPermissions(classroomId: string, userId: string): Promise<string | null> {
    if (!isValidUUID(classroomId) || !isValidUUID(userId)) {
        console.warn('Invalid classroom or user ID:', classroomId, userId);
        return false;
    }

    try {
        const classroom: any = await getFromDatabase('classrooms', classroomId);
        if (!classroom) return null;

        const owner = classroom?.owner as string | undefined;
        if (owner === userId) return 'owner';

        const teachers: string[] = Array.isArray(classroom?.teachers) ? classroom.teachers : [];
        if (teachers.includes(userId)) return 'teacher';

        const students: string[] = Array.isArray(classroom?.students) ? classroom.students : [];
        if (students.includes(userId)) return 'student';

        // const userClassrooms = (await getFromDatabase('profiles', userId, 'classrooms')) as string[] | null;
        // if (Array.isArray(userClassrooms) && userClassrooms.includes(classroomId)) {
        //     return 'authorized';
        // }

        return null;
    } catch (err) {
        console.error('Error getting classroom permissions:', err);
        return null;
    }
}

export async function findClassroomByCode(classCode: string): Promise<string | null> {
    const { data, error } = await supabase
        .from('classrooms')
        .select('*')
        .eq('class_code', classCode)
        .single();
    if (error) {
        console.error('Error finding classroom by code:', error);
        return null;
    }
    return data;
}

export async function joinClassroom(classCode: string) {
    if (!classCode || classCode.length !== 8) {
        console.warn('Invalid class code:', classCode);
        return null;
    }

    try {
        const classroom = await findClassroomByCode(classCode);
        if (!classroom) {
            console.warn('No classroom found for class code:', classCode);
            return null;
        }

        const userId = (await getCurrentUserData())?.id;
        if (!userId) {
            console.error('No authenticated user found');
            return null;
        }

        const role = await getClassroomPermissions(classroom.id, userId);
        if (role) {
            console.warn('User already has access to this classroom:', role);
            return null;
        }

        // Add user to classroom
        await appendToDatabase('classrooms', classroom.id, 'students', userId);
        await appendToDatabase('profiles', userId, 'classrooms', classroom.id);

        return classroom;
    } catch (error) {
        console.error('Error joining classroom:', error);
        return null;
    }
}

export async function headerAuth() {
    const updateHeaderAuthState = async () => {
        const loginButton= document.getElementById('header-login-button') as HTMLButtonElement;
        const accountButton = document.getElementById('header-loggedin-button') as HTMLButtonElement;
        const usernameElement= document.getElementById('header-username') as HTMLDivElement;
        const mobileLoginButton = document.getElementById('mobile-header-login-button') as HTMLButtonElement;
        
        if (!loginButton || !accountButton || !usernameElement || !mobileLoginButton) {
            return;
        }

        if (await isAuthenticated()) {
            loginButton.style.display = 'none'
            accountButton.style.display = 'inline-flex'
            mobileLoginButton.style.display = 'none'
            
            const userData = await getCurrentUserData()
            const displayName = userData.display_name
            const firstName = userData?.first_name
            const email = userData?.full_name
            usernameElement.textContent = displayName || firstName || email || 'User'
        } else {
            loginButton.style.display = 'inline-flex'
            accountButton.style.display = 'none'
            usernameElement.textContent = ''

            mobileLoginButton.style.display = 'inline-flex'
        }
    }

    document.addEventListener('DOMContentLoaded', async () => {
        await updateHeaderAuthState()
    })
}

function genRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

export async function validateClassroom(id): Promise<boolean> {
    if (!id || typeof id !== 'string' || id.length !== 36) {
        console.warn('Invalid classroom ID:', id);
        return false;
    }
    try {
        const { data, error } = await supabase
            .from('classrooms')
            .select('id')
            .eq('id', id)
            .single();

        if (error) {
            console.error('Error validating classroom:', error);
            return false;
        }

        return !!data;
    } catch (error) {
        console.error('Unexpected error during classroom validation:', error);
        return false;
    }
}

export async function generateClassCode(classroomId: string): Promise<string | null> {
    if (!(await validateClassroom(classroomId))) {
        console.warn('generateClassCode: invalid classroomId', classroomId);
        return null;
    }

    const length = 8;
    const genCode = () => {
        let out = '';
        for (let i = 0; i < length; i++) {
            out += String(genRandomInt(0, 9));
        }
        return out;
    };

    for (let attempt = 0; attempt < 60; attempt++) {
        const code = genCode();

        const { data: existingCode, error: checkErr } = await supabase
            .from('classrooms')
            .select('id')
            .eq('class_code', code)
            .maybeSingle();

        if (checkErr) {
            console.error('Error checking code uniqueness (attempt ' + attempt + '):', checkErr);
            continue;
        }

        if (existingCode) continue;
        await writeToDatabase('classrooms', classroomId, 'class_code', code, true);
        return code || null;
    }

    return null;
}



export async function isValidEmail(email: string): Promise<boolean | string> {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = email.trim().toLowerCase();

    if (!emailRegex.test(cleanEmail)) {
        return 'Please enter a valid email address';
    }

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('email')
            .eq('email', cleanEmail);

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

// Classroom OOP
export interface ClassroomCreationData {
    name: string;
    description?: string | null;
    year_level?: string | null;
    course_code?: string | null;
    location?: string | null;
    lms_url?: string | null;
    security?: unknown;
    features?: unknown;
}

interface ClassroomRow {
    id: string;
    owner: string;
    name: string;
    students?: string[];
    teachers?: string[];
    created_at?: string;
    avatar_url?: string | null;
    year_level?: string | null;
    course_code?: string | null;
    location?: string | null;
    lms_url?: string | null;
    security?: unknown;
    features?: unknown;
    class_code?: number | null;
    school?: string | null;
    description?: string | null;
    status?: string | null;
    color?: string | null;
}

export class Classroom {
    constructor(public id: string, public owner: string, private data: ClassroomRow) {}

    get name() { return this.data.name; }
    set name(value: string) {
        this.data.name = value;
        writeToDatabase('classrooms', this.id, 'name', value, true)
            .catch(err => console.error('Failed to persist classroom name:', err));
    }
    get description() { return this.data.description; }
    set description(value: string | null | undefined) {
        this.data.description = value;
        writeToDatabase('classrooms', this.id, 'description', value, true)
            .catch(err => console.error('Failed to persist classroom description:', err));
    }
    get year_level() { return this.data.year_level; }
    set year_level(value: string | null | undefined) {
        this.data.year_level = value;
        writeToDatabase('classrooms', this.id, 'year_level', value, true)
            .catch(err => console.error('Failed to persist classroom year_level:', err));
    }
    get course_code() { return this.data.course_code; }
    set course_code(value: string | null | undefined) {
        this.data.course_code = value;
        writeToDatabase('classrooms', this.id, 'course_code', value, true)
            .catch(err => console.error('Failed to persist classroom course_code:', err));
    }
    get location() { return this.data.location; }
    set location(value: string | null | undefined) {
        this.data.location = value;
        writeToDatabase('classrooms', this.id, 'location', value, true)
            .catch(err => console.error('Failed to persist classroom location:', err));
    }
    get lms_url() { return this.data.lms_url; }
    set lms_url(value: string | null | undefined) {
        this.data.lms_url = value;
        writeToDatabase('classrooms', this.id, 'lms_url', value, true)
            .catch(err => console.error('Failed to persist classroom lms_url:', err));
    }
    get security_level() { return this.data.security; }
    set security_level(value: unknown) {
        this.data.security = value;
        writeToDatabase('classrooms', this.id, 'security', value, true)
            .catch(err => console.error('Failed to persist classroom security:', err));
    }
    get features() { return this.data.features; }
    set features(value: unknown) {
        this.data.features = value;
        writeToDatabase('classrooms', this.id, 'features', value, true)
            .catch(err => console.error('Failed to persist classroom features:', err));
    }
    get color() { return this.data.color; }
    set color(value: string | null | undefined) {
        this.data.color = value;
        writeToDatabase('classrooms', this.id, 'color', value, true)
            .catch(err => console.error('Failed to persist classroom color:', err));
    }

    get raw(): ClassroomRow { return this.data; }
    get students(): string[] { return Array.isArray(this.data.students) ? this.data.students : []; }
    get teachers(): string[] { return Array.isArray(this.data.teachers) ? this.data.teachers : []; }

    static async create(payload: ClassroomCreationData): Promise<Classroom | null> {
        const id = await createClassroom(payload);
        if (!id) return null;
        const row = await getFromDatabase('classrooms', id);
        return row ? new Classroom(id, row.owner, row) : null;
    }

    static async load(id: string): Promise<Classroom | null> {
        if (!isValidUUID(id)) return null;
        const row = await getFromDatabase('classrooms', id) as ClassroomRow | null;
        if (!row) return null;
        return new Classroom(id, row.owner, row);
    }

    static async byCode(code: string): Promise<Classroom | null> {
        const foundId = await findClassroomByCode(code);
        if (!foundId || typeof foundId !== 'string') return null;
        const row = await getFromDatabase('classrooms', foundId) as ClassroomRow | null;
        return row ? new Classroom(row.id, row.owner, row) : null;
    }

    async save(): Promise<boolean> {
        try {
            const remoteData = await getFromDatabase('classrooms', this.id) as ClassroomRow | null;

            const { id, created_at, owner, ...updateData } = this.data;
            const promises = Object.entries(updateData)
                .filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(remoteData[key]))
                .map(([key, value]) =>
                    writeToDatabase('classrooms', this.id, key, value, true)
                );

            if (promises.length > 0) {
                await Promise.all(promises);
            }
            
            return true;
        } catch (error) {
            console.error('Error saving classroom data:', error);
            return false;
        }
    }

    async refresh(): Promise<void> {
        const row = await getFromDatabase('classrooms', this.id);
        if (row) this.data = row;
    }

    async generateCode(): Promise<string | null> {
        return await generateClassCode(this.id);
    }

    async roleForUser(userId: string): Promise<string | null> {
        return await getClassroomPermissions(this.id, userId);
    }

    async addStudent(userId: string): Promise<boolean> {
        if (!userId) return false;
        await appendToDatabase('classrooms', this.id, 'students', userId, true);
        await appendToDatabase('profiles', userId, 'classrooms', this.id, true);
        await this.refresh();
        return true;
    }

    async removeStudent(userId: string): Promise<boolean> {
        await appendToDatabase('classrooms', this.id, 'students', userId, false);
        await this.refresh();
        return true;
    }
}