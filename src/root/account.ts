import { createClient } from '@supabase/supabase-js'
import 'blockly/blocks';
import { getProjects } from '@root/blockly/serialization';
import dayjs, { Dayjs } from 'dayjs';
import { PostgrestError } from '@supabase/supabase-js';

// --- Supabase Initialization --- //

const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// --- Authentication & Session Management --- //

export async function authCheck(role: string = 'user', redirect: boolean = true):Promise<boolean | null> {
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
        console.error('Auth error:', error)
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
                window.location.href = '/account/login'
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

export async function isAuthenticated(): Promise<boolean> {
    try {
        const { data: { session } } = await supabase.auth.getSession()
        return !!session
    } catch (error) {
        console.error('Auth check failed:', error)
        return false
    }
}

export async function signIn(email: string, password: string): Promise<void> {
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

export async function signOut(redirectTo: string = '/'): Promise<boolean> {
    let success: boolean = true;
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
            localStorage.removeItem('robox-auth-cache');
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

export async function deleteAccount(): Promise<void> {
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

// --- User Data & Profile Management --- //

export async function getCurrentUserData(): Promise<Record<string, unknown> | null | false> {
    try {
        const { data: sessionData } = await supabase.auth.getSession()
        const token = sessionData?.session?.access_token ?? null
    
        const headers: Record<string, string> = { 'Content-Type': 'application/json' }
        if (token) headers.Authorization = `Bearer ${token}`
    
        const resp = await fetch('/api/account/user/info', {
            method: 'POST',
            headers
        })
    
        const result = await resp.json().catch(() => ({}))
    
        if (!resp.ok) {
            return false
        }
        return result.data || {}
    } catch (error) {
        console.error('Failed to get user data:', error)
        return null
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

export async function checkEmailAvailability(email: string): Promise<boolean | string> {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = email.trim().toLowerCase();

    if (!emailRegex.test(cleanEmail)) {
        return 'Please enter a valid email address';
    }

    try {
        const res = await fetch('/api/account/email-check', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: cleanEmail })
        });

        if (!res.ok) {
            console.error('Email check request failed with status', res.status);
            return 'Unable to validate email';
        }

        const data = await res.json();
        return !!data.exists;
    } catch (err) {
        console.error('Unexpected error during email validation:', err);
        return 'Unable to validate email';
    }
}

// --- Generic Database Helpers --- //

export async function getFromDatabase<T>(tableName: string, objectId: string, column?: string): Promise<T | null> {
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
        const result = data[0];
        return column ? result[column] : result;
    } catch (error) {
        console.error('Failed to retrieve data from database:', error)
        throw error
    }
}

export async function writeToDatabase<T>(tableName: string, objectId: string, column: string, value: T, overwrite: boolean = true): Promise<Record<string, unknown> | null> {
    try {
        let data: Record<string, unknown>[] | null, error: PostgrestError | null;
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

export async function appendToDatabase<T>(tableName: string, objectId: string, column: string, value: T, add: boolean = true): Promise<Record<string, unknown> | T[] | null> {
    const current = await getFromDatabase<T[]>(tableName, objectId, column);
    const arr: T[] = Array.isArray(current) ? [...current] : [];

    let updated: T[] = arr;

    if (add) {
        if (value !== undefined && value !== null && !arr.includes(value)) {
            updated = [...arr, value];
        }
    } else {
        updated = arr.filter(v => v !== value);
    }

    if (updated === arr) {
        return current;
    }

    return await writeToDatabase(tableName, objectId, column, updated, true);
}

// --- Project Management --- //

export async function updateProjectData(project_id: string, project_data: string | object): Promise<void> {
    try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
            console.error('No active session found for updating project data.');
            return;
        }

        const payload = {
            project_data: typeof project_data === 'string' ? JSON.parse(project_data) : project_data
        };

        const response = await fetch(`/api/projects/${project_id}`, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error(`Failed to update project data for ${project_id}. Status: ${response.status}`, errorData.error);
            throw new Error(`Failed to update project: ${errorData.error}`);
        }

    } catch (error) {
        console.error('Error updating project data:', error);
        // Re-throwing allows the caller to handle the error if needed
        throw error;
    }
}

export async function loadProjectData(uuid: string): Promise<Record<string, unknown> | null> {
    if (!isValidUUID(uuid)) {
        console.warn('Invalid project UUID for loadProjectData:', uuid);
        return null;
    }

    try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
            console.error('No active session found for loading project data.');
            return null;
        }

        const response = await fetch(`/api/projects/${uuid}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
            },
        });

        if (!response.ok) {
            console.error(`Failed to fetch project data for ${uuid}. Status: ${response.status}`);
            return null;
        }

        const { project } = await response.json();

        if (!project) {
            console.warn(`No project_data found for project ${uuid}`);
            return null;
        }

        return project
    } catch (error) {
        console.error('Error loading project data:', error);
        return null;
    }
}

export async function isSyncedProject(uuid: string): Promise<boolean> {
    if (!isValidUUID(uuid)) {
        console.warn('Invalid UUID:', uuid);
        return false;
    }
    const cloudSync = await getFromDatabase<boolean>('projects', uuid, 'cloud_sync');
    return !!cloudSync;
}

export async function deleteCloudProject(uuid: string): Promise<void> {
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

export async function syncCloudProjects(userId?: string): Promise<void> {
    try {
        if (!userId) return;
        const remoteIds = await findUserProjects(userId);
        if (!remoteIds || remoteIds.length === 0) return;
        const projects = getProjects();
        let changed = false;
        for (const id of remoteIds) {
            if (!projects[id]) {
                const remoteProject = await getFromDatabase<any>('projects', id);
                const name = (remoteProject && remoteProject.name) ?? 'unnamed project';
                const last_updated = (remoteProject && remoteProject.last_updated) ?? new Date().toISOString();

                const projectDataRaw = remoteProject?.project_data;
                let projectDataParsed: any = null;
                try { projectDataParsed = JSON.parse(projectDataRaw); } catch {}

                const placeholder: Project = {
                    id,
                    owner: userId,
                    name,
                    workspace: {},
                    thumbnail: projectDataParsed?.thumbnail || '',
                    time: dayjs(last_updated),
                    extensions: {}
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

export async function uploadNewProject(projectId: string, userId: string, name: string): Promise<Record<string, unknown> | null> {
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

export async function getProjectSyncStatus(uuid: string): Promise<boolean> {
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

// --- Classroom Management --- //

export interface ClassroomCreationData {
    name: string;
    description?: string | null;
    year_level?: string | null;
    course_code?: string | null;
    location?: string | null;
    lms_url?: string | null;
    security?: number;
    features?: string[];
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
    security?: number;
    features?: string[];
    class_code?: number | null;
    school?: string | null;
    description?: string | null;
    status?: string | null;
    color?: string | null;
}

export async function createClassroom(data: ClassroomCreationData): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    const ownerId = session?.user?.id;
    if (!ownerId) {
        console.error('No authenticated user found');
        return null;
    }

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

export async function removeClassroomFromProfile(classroomId: string, userId: string): Promise<boolean> {
    try {
        const tryAgain = await getFromDatabase('classrooms', classroomId);
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
        return null;
    }
    try {
        const classroom = await getFromDatabase<ClassroomRow>('classrooms', classroomId);
        if (!classroom) return null;

        const owner = classroom?.owner;
        if (owner === userId) return 'owner';

        const teachers: string[] = Array.isArray(classroom?.teachers) ? classroom.teachers : [];
        if (teachers.includes(userId)) return 'teacher';

        const students: string[] = Array.isArray(classroom?.students) ? classroom.students : [];
        if (students.includes(userId)) return 'student';

        return null;
    } catch (err) {
        console.error('Error getting classroom permissions:', err);
        return null;
    }
}

export async function findClassroomByCode(classCode: string): Promise<any | null> {
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

export async function joinClassroom(classCode: string): Promise<any | null> {
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

        const userData = await getCurrentUserData();
        const userId = userData ? (userData.id as string) : null;
        if (!userId) {
            console.error('No authenticated user found');
            return null;
        }

        const role = await getClassroomPermissions(classroom.id, userId);
        if (role) {
            console.warn('User already has access to this classroom:', role);
            return null;
        }

        await appendToDatabase('classrooms', classroom.id, 'students', userId);
        await appendToDatabase('profiles', userId, 'classrooms', classroom.id);

        return classroom;
    } catch (error) {
        console.error('Error joining classroom:', error);
        return null;
    }
}

export async function validateClassroom(id: string): Promise<boolean> {
    if (!isValidUUID(id)) {
        console.warn('Invalid classroom ID format:', id);
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
        console.warn('Invalid classroomId', classroomId);
        return null;
    }

    const length = 8;
    const genCode = () => {
        let out: string = '';
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


// --- UI & Frontend Helpers --- //

export async function headerAuth(): Promise<void> {
    const loginButton = document.getElementById('header-login-button') as HTMLButtonElement;
    const accountButton = document.getElementById('header-loggedin-button') as HTMLButtonElement;
    const usernameElement = document.getElementById('header-username') as HTMLDivElement;
    const mobileLoginButton = document.getElementById('mobile-header-login-button') as HTMLButtonElement;

    if (!loginButton || !accountButton || !usernameElement || !mobileLoginButton) {
        return;
    }

    const updateHeaderUI = (userData: any) => {
        if (userData) {
            loginButton.style.display = 'none';
            accountButton.style.display = 'inline-flex';
            mobileLoginButton.style.display = 'none';
            const displayName = userData.display_name as string | undefined;
            const firstName = userData?.first_name as string | undefined;
            const email = userData?.full_name as string | undefined;
            usernameElement.textContent = displayName || firstName || email || 'User';
        } else {
            loginButton.style.display = 'inline-flex';
            accountButton.style.display = 'none';
            mobileLoginButton.style.display = 'inline-flex';
            usernameElement.textContent = '';
        }
    };

    const cacheKey = 'robox-auth-cache';
    const avatarCacheKey = 'robox-avatar-cache';

    const cachedData = localStorage.getItem(cacheKey);
    if (cachedData) {
        updateHeaderUI(JSON.parse(cachedData));
    }

    const revalidate = async () => {
        let freshData = null;
        if (await isAuthenticated()) {
            freshData = await getCurrentUserData();
        }

        if (freshData) {
            localStorage.setItem(cacheKey, JSON.stringify(freshData));
            if (freshData.avatar_url) {
                await cacheAvatarImage(freshData.avatar_url as string);
            }
        } else {
            localStorage.removeItem(cacheKey);
            localStorage.removeItem(avatarCacheKey);
        }
        
        updateHeaderUI(freshData);
    };

    addEventListener('DOMContentLoaded', async () => {
        const image = document.getElementById('header-avatar') as HTMLImageElement;
        
        const cachedAvatar = localStorage.getItem(avatarCacheKey);
        if (cachedAvatar) {
            image.src = cachedAvatar;
        }
        
        await revalidate();
        updateHeaderAvatar();
    });
}

async function cacheAvatarImage(url: string): Promise<string | null> {
    const avatarCacheKey = 'robox-avatar-cache';
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64 = reader.result as string;
                localStorage.setItem(avatarCacheKey, base64);
                resolve(base64);
            };
            reader.onerror = () => resolve(null);
            reader.readAsDataURL(blob);
        });
    } catch {
        return null;
    }
}

export function updateHeaderAvatar(url?: string): void {
    const image = document.getElementById('header-avatar') as HTMLImageElement | null;
    if (!image) return;

    const avatarCacheKey = 'robox-avatar-cache';
    
    const cachedAvatar = localStorage.getItem(avatarCacheKey);
    if (cachedAvatar && !url) {
        image.src = cachedAvatar;
    }

    getCurrentUserData()
        .then(async userData => {
            const fallbackUrl = url?.trim() ? url : userData?.avatar_url as string;
            const seed = userData?.id || 'default';
            const finalUrl = fallbackUrl || `https://api.dicebear.com/9.x/bottts/svg?seed=${seed}`;
            
            if (finalUrl) {
                const cachedBase64 = await cacheAvatarImage(finalUrl);
                if (cachedBase64) {
                    image.src = cachedBase64;
                    return;
                }
            }
            
            image.src = finalUrl;
        })
        .catch(error => {
            console.warn('Failed to refresh header avatar:', error);
            const fallback = cachedAvatar || 'https://api.dicebear.com/9.x/bottts/svg?seed=robox';
            image.src = fallback;
        });
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function showAlert(message: string, type: 'info' | 'warning' | 'error' | 'success' = 'info', duration: number = 5000): Promise<void> {
    const alertContainer = document.createElement('div');
    alertContainer.className = `alert alert-${type}`;
    alertContainer.textContent = message;
}

export function checkPasswordRequirements(password: string): boolean | string {
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
    if (!/[!@#$%^&*_(),.?":{}|<>]/.test(password)) {
        problems.push('contain at least one special character');
    }
    if (problems.length === 0) {
        return true;
    }
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

// --- General Utilities --- //

function isProtoPollution(key: string): boolean {
    const forbiddenKeys = ["__proto__", "constructor", "prototype"];
    return forbiddenKeys.includes(key);
}

export function isValidUUID(uuid: string): boolean {
    if (isProtoPollution(uuid)) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

function genRandomInt(min: number, max: number): number {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}