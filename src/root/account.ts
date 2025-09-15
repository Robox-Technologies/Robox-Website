// this file contains all the functions for managing user accounts, authentication,
// and interacting with the database (Supabase). it handles things like logging in,
// signing out, managing projects, and classroom features

import { createClient } from '@supabase/supabase-js'
import 'blockly/blocks';
import { getProjects } from '@root/blockly/serialization';
import dayjs from 'dayjs';

// initialize Supabase client
// Supabase is our backend service for database and authentication
// these lines set up the connection to Supabase using special keys
const supabaseUrl = process.env.SUPABASE_URL
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(supabaseUrl, supabaseKey)

// checks if a user is logged in and has the correct role
// returns true if the user meets the role requirement, false otherwise
export async function authCheck(role: string = 'user', redirect: boolean = true):Promise<boolean | null> {
    // get the current user's session from supabase
    const { data: { session }, error } = await supabase.auth.getSession()

    if (error) {
        console.error('Auth error:', error)
        return false
    }

    // if theres no active session
    if (!session) {
        return false
    }

    // if we need to check for a 'student' or 'teacher' role, get it from the database to minimize unnecessary requests
    let userRole: 'student' | 'teacher' | null = null; // userRole can only be one of these specific string values or null
    if (role === 'student' || role === 'teacher') {
        if (session) {
            userRole = await getFromDatabase('profiles', session.user.id, 'user_role');
        }
    }

    // check the users role against the required role
    switch (role) {
        case 'guest':
            // a guest should not have a session
            if (!session) {
                return true
            }
            if (redirect) {
                window.location.href = '/login'
            }
            return false
        case 'user':
            // a user is anyone who is logged in
            if (session) {
                return true
            }
            if (redirect) {
                window.location.href = '/student'
            }
            return false
        case 'student':
            // check if the users role is 'student'
            if (userRole === 'student') {
                return true
            }
            if (redirect) {
                window.location.href = '/student'
            }
            return false
        case 'teacher':
            // check if the users role is 'teacher'
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

// checks if a password meets the security requirements
// returns true if the password is valid, or a string explaining what's wrong in sentence form
export function checkPasswordRequirements(password: string): boolean | string {
    // Password must be at least 8 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character.

    const problems: string[] = [] // an array of strings to hold problem descriptions

    // if the password equals null or is less than 8 characters long, append "be at least 8 characters long" to the problems array
    // this is a existence check
    if (!password || password.length < 8) {
        problems.push("be at least 8 characters long");
    }
    // if the password does not contain at least one uppercase letter, append "contain at least one uppercase letter" to the problems array
    // this is a range check
    if (!/[A-Z]/.test(password)) {
        problems.push('contain at least one uppercase letter');
    }
    // if the password does not contain at least one lowercase letter, append "contain at least one lowercase letter" to the problems array
    // this is a range check
    if (!/[a-z]/.test(password)) {
        problems.push('contain at least one lowercase letter');
    }
    // if the password does not contain at least one number, append "contain at least one number" to the problems array
    if (!/\d/.test(password)) {
        problems.push('contain at least one number');
    }
    // if the password does not contain at least one special character, append "contain at least one special character" to the problems array
    // this is a range check kind of
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        problems.push('contain at least one special character');
    }
    // if there are no problems, return true
    if (problems.length === 0) {
        return true;
    }
    // create a user friendly sentence explaining the problems
    let sentence: string = 'Password must '; // a string to build the feedback message
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

// gets all data for the currently logged in user and returns the users profile data
export async function getCurrentUserData() {
    try {
        // first, get the current session to find the user's ID
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        if (sessionError) {
            console.error('Failed to get session:', sessionError)
            return null
        }
        if (!session?.user?.id) {
            console.warn('No user ID found in session')
            return null
        }
        // then, use the user's ID to get their profile from the 'profiles' table
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

// check to see if a user is currently logged in
export async function isAuthenticated() {
    try {
        const { data: { session } } = await supabase.auth.getSession()
        return !!session // !! turns the session object or null as a true/false value
    } catch (error) {
        console.error('Auth check failed:', error)
        return false
    }
}

// signs a user in
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

// signs the current user out and redirects them
export async function signOut(redirectTo: string = '/') {
    let success: boolean = true; // a boolean to track if sign out was successful
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
        // clean up any supabase related items from the browsers local storage
        try {
            Object.keys(localStorage) // get all keys in local storage
                .filter(k => k.startsWith('supabase') || k.startsWith('sb-')) // find keys that start with 'supabase' or 'sb-' (these are used by supabase)
                .forEach(k => localStorage.removeItem(k)); // for each key found, remove it from localStorage
        } catch (err) {
            console.error('Failed to clear localStorage:', err);
        }
        // redirect the user to the specified page
        window.location.replace(redirectTo);
    }
    return success;
}

// deletes the current users account
// this function calls the server api to handle the deletion because it is a sensitive operation and supabase does not support it directly in the client because you need the SERVICE_ROLE_KEY
export async function deleteAccount() {
    // get the users session token
    const { data: { session } } = await supabase.auth.getSession()
    const token = session?.access_token
    if (!token) {
        console.error('No active session found')
        return
    }

    // send a request to the ro/box server api to handle the deletion
    const res = await fetch('/api/account/delete', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        }
    })

    // if its all good then log success, otherwise log the error
    const result = await res.json()
    if (res.ok) {
        console.log('Account deleted successfully')
    } else {
        console.error('Failed to delete account:', result.error || 'Unknown error')
    }
}

// a function to get data from any table in the database
// for all database functions (get, write, append), tableName (string) is the table ('profiles' for user data, 'projects' or 'classrooms') and column (string) is optional, this will only return the data in that column, objectId is a UUID string (stored as 'id'), and value can be any type of data to be stored
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
        // if a specific column was requested, return just its value. otherwise, return the whole object
        return column ? data[0][column] : data[0];
    } catch (error) {
        console.error('Failed to retrieve data from database:', error)
        throw error
    }
}

// a general function to write or update data in any table in the database
// returns the updated data
export async function writeToDatabase(tableName: string, objectId: string, column: string, value: any, overwrite: boolean = true) {
    try {
        let data, error;
        // if overwrite is true, update the existing row. if false, insert a new row or update if it exists
        if (overwrite) {
            // update an existing row
            ({ data, error } = await supabase
                .from(tableName)
                .update({ [column]: value })
                .eq('id', objectId)
                .select());
        } else {
            ({ data, error } = await supabase
                .from(tableName)
                .upsert({ id: objectId, [column]: value }, { onConflict: 'id' }) // upsert means update if it doesnt exist
                .select());
        }
        if (error) {
            console.error('Database update error:', error)
            throw error;
        }
        // return the updated row
        return data && data.length > 0 ? data[0] : null 
    } catch (error) {
        console.error('Failed to update data in database:', error)
        throw error
    }
}

// adds or removes an item from a list stored in a database column
export async function appendToDatabase(tableName: string, objectId: string, column: string, value: any, add: boolean = true) {
	// if add = true: add value, false = delete value

	// first, get the current array from the database
	const current = await getFromDatabase(tableName, objectId, column); // get the current data of the row
	const arr: any[] = Array.isArray(current) ? [...current] : []; // any[] is a flexible array that can hold various types of data (depending on whats being stored)

	let updated: any[] = arr; // any[] is a flexible array that can hold various types of data (depending on whats being stored)

	if (add) {
        // add the value if it's not already in the array
		if (value !== undefined && value !== null && !arr.includes(value)) {
			updated = [...arr, value];
		}
	} else {
        // remove the value from the array
		updated = arr.filter(v => v !== value);
	}

    // if nothing changed, don't write to the database
	if (updated === arr) {
		return current;
	}

    // write the new, updated array back to the database
	return await writeToDatabase(tableName, objectId, column, updated, true);
}

// removes a classroom ID from a users profile
export async function removeClassroomFromProfile(classroomId: string, userId: string) {
    try {
        // check if the classroom exists
        const tryAgain = await getFromDatabase('classrooms', classroomId) as any;
        if (!tryAgain) {
            // if it doesn't exist, remove it from the users list of classrooms
            console.warn(`Classroom with ID ${classroomId} not found, removing from profile.`);
            await appendToDatabase('profiles', userId, 'classrooms', classroomId, false);
        }
        return true;
    } catch (error) {
        console.error(`Failed to remove classroom ${classroomId} from profile ${userId}:`, error);
        return false;
    }
}

// gets basic public information (like name and role) for one or more users
export async function getBasicUserData(users: string[] | string): Promise<{ id: string, display_name: string, user_role: string, avatar_url: string }[]> {
    // make sure users is an array
    const userIds = Array.isArray(users) ? users : [users];
    // fetch data for all users at the same time for efficiency
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

// a security check to prevent prototype pollution attack (ro/box's code, i just copied here from another file)
function isProtoPollution(key: string): boolean {
    const forbiddenKeys = ["__proto__", "constructor", "prototype"];
    return forbiddenKeys.includes(key);
}

// checks if a string is a valid UUID
// returns true if its a valid UUID format
// again, ro/box's code, i just copied it here from another file
export function isValidUUID(uuid: string): boolean {
    if (isProtoPollution(uuid)) return false;
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
}

// updates a project's data in the database (autosave)
export async function updateProjectData(project_id: string, project_data: any) {
    const now = new Date().toISOString();
    let payload: string; // string is used because project data is stored as a JSON string

    if (typeof project_data === 'string') {
        payload = project_data;
    } else {
        console.warn('updateProjectData not JSON string');
    }

    // update the project's data and its 'last_updated' timestamp
    await writeToDatabase('projects', project_id, 'project_data', payload, true);
    await writeToDatabase('projects', project_id, 'last_updated', now, true);
}

// helper function to handle different old formats of project data and make them consistent
// returns a standardized project data object
function normaliseSnapshot(pd) {
    if (pd?.workspace) return pd.workspace; // Normalize workspace data
    if (pd?.blocks?.blocks) return { blocks: pd.blocks.blocks, variables: pd.blocks.variables ?? [] }; // Normalize blocks data
    if (pd?.blocks?.languageVersion || pd?.blocks?.blocks) return { blocks: pd.blocks }; // Normalize legacy blocks data
    return null;
}

// loads a projects data from the database and into the Blockly workspace on the page
export async function loadProjectData(uuid: string) {
    if (!isValidUUID(uuid)) return null;

    const raw = await getFromDatabase('projects', uuid, 'project_data'); // retrieve raw project data
    const pd = typeof raw === 'string' ? JSON.parse(raw) : raw; // parse JSON if it's a string
    if (!pd) return null; // if no data, return null

    const snapshot = normaliseSnapshot(pd);
    if (!snapshot?.blocks) { // if no blocks in snapshot, return null
        console.error('No workspace snapshot in project_data');
        return null;
    }

    try {
        const blockly = await import('blockly/core');
        const ws = blockly.getMainWorkspace?.() || blockly.common?.getMainWorkspace?.(); // get the main workspace

        if (ws && blockly.serialization?.workspaces?.load) { // if workspace and loading function are available
            try {
                ws.clear(); // clear the workspace before loading new blocks
                const loadPayload = snapshot.blocks?.blocks ? { blocks: snapshot.blocks } : snapshot; // prepare the data for loading
                blockly.serialization.workspaces.load(loadPayload, ws); // load the data into the workspace
            } catch (e) {
                console.warn('Failed to deserialize workspace snapshot', e);
            }
        }

        return ws ?? null; // return the workspace
    } catch {
        return null;
    }
}

// checks if a project is cloud synced
export async function isSyncedProject(uuid: string): Promise<boolean> {
    if (!isValidUUID(uuid)) {
        console.warn('Invalid UUID:', uuid);
        return false;
    }
    const cloudSync = await getFromDatabase('projects', uuid, 'cloud_sync');
    return !!cloudSync;
}

// deletes a project from the cloud database
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

// syncs cloud projects to the user's local browser storage
export async function syncCloudProjects(userId?: string) {
    try {
        if (!userId) return;
        // find all project ids owned by the user in the cloud
        const remoteIds = await findUserProjects(userId);
        if (!remoteIds || remoteIds.length === 0) return;
        // get all projects currently stored in the browser's local storage (getProjects is from blockly/serialization)
        const projects = getProjects();
        let changed = false; // a boolean flag to track if local storage needs updating
        for (const id of remoteIds) {
            // if a cloud project is not in local storage, create a placeholder for it
            if (!projects[id]) {
                const remoteProject = await getFromDatabase('projects', id);
                const name = (remoteProject && (remoteProject as any).name) ?? 'unnamed project';
                const last_updated = (remoteProject && (remoteProject as any).last_updated) ?? new Date().toISOString();

                const projectDataRaw = remoteProject?.project_data;
                let projectDataParsed: any = null; // any is used because its json
                try { projectDataParsed = JSON.parse(projectDataRaw); } catch {}

                const placeholder: {
                    id: string;
                    owner: string;
                    name: string;
                    workspace: object;
                    thumbnail: string;
                    time: dayjs.Dayjs;
                } = {
                    id,
                    owner: userId,
                    name,
                    workspace: {},
                    thumbnail: projectDataParsed?.thumbnail || '',
                    time: dayjs(last_updated)
                };

                projects[id] = placeholder;
                changed = true;
            }
        }
        // if any new placeholders were added, save the updated project list to local storage
        if (changed) {
            localStorage.setItem("roboxProjects", JSON.stringify(projects));
        }
    } catch (e) {
        console.warn("Cloud project sync failed", e);
    }
}

// creates a new project entry in the database
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

// gets the cloud sync status for a specific project
export async function getProjectSyncStatus(uuid: string) {
    if (!isValidUUID(uuid)) {
        return false;
    }
    if (await getFromDatabase('projects', uuid, 'cloud_sync') === true) {
        return true;
    }
    return false;
}

// finds all project IDs owned by a specific user
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
        // make sure its an array and return the array of project objects
        return (data ?? []).map(p => p.id as string);
    } catch (error) {
        console.error('Unexpected error during user project retrieval:', error);
        return [];
    }
}

// creates a new classroom in the database
export async function createClassroom(data): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    // get the current user's ID from the data and make sure they are a valid user
    const ownerId = session?.user?.id;
    if (!ownerId) {
        console.error('No authenticated user found');
        return null;
    }

    // prepare the data to be inserted into the 'classrooms' table
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

    let classroomId: string | null = null; // string because its holding the classroom uuid

    try {
        // insert the new classroom and get its ID back
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

    // if the classroom was created successfully, add the owner to their new classroom
    if (classroomId) {
        await appendToDatabase('profiles', ownerId, 'classrooms', classroomId);
        await appendToDatabase('classrooms', classroomId, 'teachers', ownerId);
    }

    return classroomId;
}

// checks if a classroom ID corresponds to a real classroom in the database
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

// determines a user's role (owner, teacher, student) within a specific classroom
export async function getClassroomPermissions(classroomId: string, userId: string): Promise<string | null> {
    if (!isValidUUID(classroomId) || !isValidUUID(userId)) {
        console.warn('Invalid classroom or user ID:', classroomId, userId);
        return null;
    }
    // get the classroom data from the database
    try {
        const classroom: any = await getFromDatabase('classrooms', classroomId);
        if (!classroom) return null;

        // check if the user is the owner
        const owner = classroom?.owner as string | undefined;
        if (owner === userId) return 'owner';

        // check if the user is in the list of teachers
        // this is a type check
        const teachers: string[] = Array.isArray(classroom?.teachers) ? classroom.teachers : [];
        if (teachers.includes(userId)) return 'teacher';

        // check if the user is in the list of students
        // this is a type check
        const students: string[] = Array.isArray(classroom?.students) ? classroom.students : [];
        if (students.includes(userId)) return 'student';

        return null;
    } catch (err) {
        console.error('Error getting classroom permissions:', err);
        return null;
    }
}

// finds a classroom using its unique 8-digit class code
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

// allows a logged-in user to join a classroom using a class code
export async function joinClassroom(classCode: string) {
    if (!classCode || classCode.length !== 8) {
        console.warn('Invalid class code:', classCode);
        return null;
    }

    try {
    // find the classroom associated with the code
    const classroom = await findClassroomByCode(classCode);
        if (!classroom) {
            console.warn('No classroom found for class code:', classCode);
            return null;
        }

        // get the current users id
        const userId = (await getCurrentUserData())?.id;
        if (!userId) {
            console.error('No authenticated user found');
            return null;
        }

    // check if the user is already in the classroom
    const role = await getClassroomPermissions(classroom.id, userId);
        if (role) {
            console.warn('User already has access to this classroom:', role);
            return null;
        }

        // add the user to the classroom's student list and update the users profile
        await appendToDatabase('classrooms', classroom.id, 'students', userId);
        await appendToDatabase('profiles', userId, 'classrooms', classroom.id);

        return classroom;
    } catch (error) {
        console.error('Error joining classroom:', error);
        return null;
    }
}

// updates the website's header to show either a "Login" button or the user's name and an "Account" button
// this runs on every page load
// TODO: make the auth state local storage to prevent unnecessary requests and speed up the header update
export async function headerAuth() {
    const updateHeaderAuthState = async () => {
        const loginButton= document.getElementById('header-login-button') as HTMLButtonElement;
        const accountButton = document.getElementById('header-loggedin-button') as HTMLButtonElement;
        const usernameElement= document.getElementById('header-username') as HTMLDivElement;
        const mobileLoginButton = document.getElementById('mobile-header-login-button') as HTMLButtonElement;
        
        if (!loginButton || !accountButton || !usernameElement || !mobileLoginButton) {
            return;
        }

        // check if the user is logged in
        if (await isAuthenticated()) {
            // if logged in, show account info and hide login button
            loginButton.style.display = 'none'
            accountButton.style.display = 'inline-flex'
            mobileLoginButton.style.display = 'none'
            
            const userData = await getCurrentUserData();
            const displayName = userData.display_name
            const firstName = userData?.first_name
            const email = userData?.full_name
            usernameElement.textContent = displayName || firstName || email || 'User'
        } else {
            // if not logged in, show login button and hide account info
            loginButton.style.display = 'inline-flex'
            accountButton.style.display = 'none'
            usernameElement.textContent = ''

            mobileLoginButton.style.display = 'inline-flex'
        }
    }

    // run this function once the page content has loaded
    document.addEventListener('DOMContentLoaded', async () => {
        await updateHeaderAuthState()
    })
}

// generates a random integer between a min and max value
function genRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// validation check for a classroom ID
// returns true if the classroom exists
export async function validateClassroom(id): Promise<boolean> {
    // basic format check for a UUID
    if (!isValidUUID(id)) {
        console.warn('Invalid classroom ID format:', id);
        return false;
    }
    // check the database to see if the classroom exists
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

// generates a unique 8-digit code for a classroom that students can use to join
export async function generateClassCode(classroomId: string): Promise<string | null> {
    if (!(await validateClassroom(classroomId))) {
        console.warn('Invalid classroomId', classroomId);
        return null;
    }

    const length = 8;
    const genCode = () => {
        let out: string = ''; // string to build the code character by character
        for (let i = 0; i < length; i++) { // generate 8 random digits and combine them into a string
            out += String(genRandomInt(0, 9));
        }
        return out;
    };

    // try to generate a unique code up to 60 times
    for (let attempt = 0; attempt < 60; attempt++) {
        const code = genCode();

        // check if the generated code is already in use by another classroom
        const { data: existingCode, error: checkErr } = await supabase
            .from('classrooms')
            .select('id')
            .eq('class_code', code)
            .maybeSingle();

        if (checkErr) {
            console.error('Error checking code uniqueness (attempt ' + attempt + '):', checkErr);
            continue;
        }

        // if the code is already used, try again
        if (existingCode) continue;
        // if the code is unique, save it to the classroom and return it
        await writeToDatabase('classrooms', classroomId, 'class_code', code, true);
        return code || null;
    }

    // if a unique code couldn't be generated after many attempts, return null
    return null;
}

// checks if an email address is valid and if it's already registered in the system
export async function isValidEmail(email: string): Promise<boolean | string> {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const cleanEmail = email.trim().toLowerCase();

    if (!emailRegex.test(cleanEmail)) {
        return 'Please enter a valid email address';
    }

    try {
        // check if the email exists in the 'profiles' table
        const { data, error } = await supabase
            .from('profiles')
            .select('email')
            .eq('email', cleanEmail);

        if (data && data.length > 0) {
            // email already exists
            return true;
        }

        if (error) {
            console.error('Supabase error:', error);
            return 'Please try again later.';
        }
        // email is valid and does not exist yet
        return false;
    } catch (err) {
        console.error('Unexpected error during email validation:', err);
        return 'Unable to validate email';
    }
}

// the following section defines a 'Classroom' class. for OOP!
// defines the template data needed to create a new classroom
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

// defines the structure of a classroom's data as it is stored in the database
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

// classroom class to manage classroom data and interactions
export class Classroom {
    constructor(public id: string, public owner: string, private data: ClassroomRow) {}

    // 'getters' and 'setters' to access and change classroom properties
    get name() { return this.data.name; }
    set name(value: string) {
        this.data.name = value;
        writeToDatabase('classrooms', this.id, 'name', value, true)
            .catch(err => console.error('Failed to set classroom name:', err));
    }
    get description() { return this.data.description; }
    set description(value: string | null | undefined) {
        this.data.description = value;
        writeToDatabase('classrooms', this.id, 'description', value, true)
            .catch(err => console.error('Failed to set classroom description:', err));
    }
    get year_level() { return this.data.year_level; }
    set year_level(value: string | null | undefined) {
        this.data.year_level = value;
        writeToDatabase('classrooms', this.id, 'year_level', value, true)
            .catch(err => console.error('Failed to set classroom year_level:', err));
    }
    get course_code() { return this.data.course_code; }
    set course_code(value: string | null | undefined) {
        this.data.course_code = value;
        writeToDatabase('classrooms', this.id, 'course_code', value, true)
            .catch(err => console.error('Failed to set classroom course_code:', err));
    }
    get location() { return this.data.location; }
    set location(value: string | null | undefined) {
        this.data.location = value;
        writeToDatabase('classrooms', this.id, 'location', value, true)
            .catch(err => console.error('Failed to set classroom location:', err));
    }
    get lms_url() { return this.data.lms_url; }
    set lms_url(value: string | null | undefined) {
        this.data.lms_url = value;
        writeToDatabase('classrooms', this.id, 'lms_url', value, true)
            .catch(err => console.error('Failed to set classroom lms_url:', err));
    }
    get security_level() { return this.data.security; }
    set security_level(value: number) {
        this.data.security = value;
        writeToDatabase('classrooms', this.id, 'security', value, true)
            .catch(err => console.error('Failed to set classroom security:', err));
    }
    get features() { return this.data.features; }
    set features(value: string[]) {
        this.data.features = value;
        writeToDatabase('classrooms', this.id, 'features', value, true)
            .catch(err => console.error('Failed to set classroom features:', err));
    }
    get color() { return this.data.color; }
    set color(value: string | null | undefined) {
        this.data.color = value;
        writeToDatabase('classrooms', this.id, 'color', value, true)
            .catch(err => console.error('Failed to set classroom color:', err));
    }

    // getters for raw data and lists of students/teachers
    get raw(): ClassroomRow { return this.data; }
    get students(): string[] { return Array.isArray(this.data.students) ? this.data.students : []; }
    get teachers(): string[] { return Array.isArray(this.data.teachers) ? this.data.teachers : []; }

    // creates a new classroom and returns it as a Classroom object
    static async create(payload: ClassroomCreationData): Promise<Classroom | null> {
        const id = await createClassroom(payload);
        if (!id) return null;
        const row = await getFromDatabase('classrooms', id);
        return row ? new Classroom(id, row.owner, row) : null;
    }

    // loads an existing classroom from the database by its ID
    static async load(id: string): Promise<Classroom | null> {
        if (!isValidUUID(id)) return null;
        const row = await getFromDatabase('classrooms', id) as ClassroomRow | null;
        if (!row) return null;
        return new Classroom(id, row.owner, row);
    }

    // loads a classroom from the database by its 8-digit class code
    static async byCode(code: string): Promise<Classroom | null> {
        const foundClassroom = await findClassroomByCode(code);
        if (!foundClassroom) return null;
        const row = await getFromDatabase('classrooms', foundClassroom.id) as ClassroomRow | null;
        return row ? new Classroom(row.id, row.owner, row) : null;
    }

    // saves any changes made to the classroom object to the database
    async save(): Promise<boolean> {
        try {
            const remoteData = await getFromDatabase('classrooms', this.id) as ClassroomRow | null;

            // make a object without id, created_at, owner because those should never change
            const { id, created_at, owner, ...updateData } = this.data;
            
            // make a list of fields that should never change (promises)
            const promises = Object.entries(updateData)
                // .filter compares the current data with the remote data to see what has changed
                // JSON.stringify is used to do a comparison for arrays and objects
                .filter(([key, value]) => JSON.stringify(value) !== JSON.stringify(remoteData[key]))
                // for each property that has changed, write its new value to the database
                .map(([key, value]) =>
                    writeToDatabase('classrooms', this.id, key, value, true)
                );

            // if there are any fields to update
            if (promises.length > 0) {
                // execute all the update promises at the same time and wait for them to complete
                await Promise.all(promises);
            }
            return true;
        } catch (error) {
            console.error('Error saving classroom data:', error);
            return false;
        }
    }

    // refreshes the classrooms data from the database to make sure it's up to date
    async refresh(): Promise<void> {
        const row = await getFromDatabase('classrooms', this.id);
        if (row) this.data = row;
    }

    // generates a new class code for this classroom
    async generateCode(): Promise<string | null> {
        return await generateClassCode(this.id);
    }

    // checks the role of a specific user in this classroom
    async roleForUser(userId: string): Promise<string | null> {
        return await getClassroomPermissions(this.id, userId);
    }

    // adds a student to this classroom
    async addStudent(userId: string): Promise<boolean> {
        if (!userId) return false;
        await appendToDatabase('classrooms', this.id, 'students', userId, true);
        await appendToDatabase('profiles', userId, 'classrooms', this.id, true);
        await this.refresh();
        return true;
    }

    // removes a student from this classroom
    async removeStudent(userId: string): Promise<boolean> {
        await appendToDatabase('classrooms', this.id, 'students', userId, false);
        await this.refresh();
        return true;
    }
}