import { authCheck, createClassroom } from '@root/account'

// first, check if the user is logged in
authCheck()

// wait for the whole page to load up before doing this
addEventListener('DOMContentLoaded', () => {
    // Inputs
    const classroomNameInput = document.getElementById('name-input') as HTMLInputElement | null; 
    const classroomDescriptionInput = document.getElementById('description-input') as HTMLInputElement | null;
    const classroomYearLevelInput = document.getElementById('year-level-input') as HTMLInputElement | null;
    const classroomCourseCodeInput = document.getElementById('class-code-input') as HTMLInputElement | null;
    const classroomLocationInput = document.getElementById('location-input') as HTMLInputElement | null;
    const classroomLmsInput = document.getElementById('lms-input') as HTMLInputElement | null;
    const classroomSecurityInput = document.getElementById('classroom-security') as HTMLInputElement | null;
    const classroomFeaturesInput = document.getElementById('classroom-features') as HTMLInputElement | null;

    // Error ID's
    const classroomNameError = document.getElementById('name-error') as HTMLElement | null;
    const classroomLmsUrlError = document.getElementById('lms-url-error') as HTMLElement | null;

    const createButton = document.getElementById('create-classroom-button');
    // if the create button exists 
    if (createButton) {
        // listen for a click on it and when it happens
        createButton.addEventListener('click', async () => {
            // check if the classroom name and lms url are valid from the inputs
            const nameValidation = validateClassroomName();
            const lmsValidation = validateLmsUrl();
            // only if BOTH the name and URL are good to go
            if (nameValidation && lmsValidation) {
                // put together all the classroom info into one object
                const newClassroom = {
                    name: classroomNameInput?.value || "My Ro/Box Classroom",
                    description: classroomDescriptionInput?.value || null,
                    year_level: classroomYearLevelInput?.value || null,
                    course_code: classroomCourseCodeInput?.value || null,
                    location: classroomLocationInput?.value || null,
                    lms_url: (classroomLmsInput?.value.trim() || null),
                    security_level: classroomSecurityInput?.value || 1,
                    features: [classroomFeaturesInput?.value] || null
                };
                // use the createClassroom function and wait for it to finish
                const classroomId = await createClassroom(newClassroom); // this will return the new classroom's ID
                if (classroomId) {
                    // redirect user to the new classroom page
                    window.location.href = `/classroom?id=${classroomId}`;
                }
                // if it didn't work
                else {
                    console.error('Failed to create classroom:', classroomId);
                    // alert user
                    // TODO: replace with a nicer error message on the page
                    alert('Failed to create classroom. Please try again.');
                }
            }
        });
    }

    function validateClassroomName() {
        // remove any extra spaces from the start or end
        const name = classroomNameInput.value.trim();
        // if there's no name
        if (!name) {
            // show the error message
            classroomNameError.innerHTML = 'Classroom name is required.';
            classroomNameError.style.display = 'block';
            return false;
        } else {
            // if there is a name, hide the error message
            classroomNameError.innerHTML = '';
            classroomNameError.style.display = 'none';
            return true;
        }
    }

    // this function checks if the lms url is a real url
    function validateLmsUrl() {
        // get the url and trim spaces
        const lmsUrl = classroomLmsInput.value.trim();
        // if there is a url but it's not a valid one
        if (lmsUrl && !isValidUrl(lmsUrl)) {
            // show an error message explaining what to do
            classroomLmsUrlError.innerHTML = "Please enter a valid LMS URL. (Make sure you're including http:// or https://)";
            classroomLmsUrlError.style.display = 'block';
            return false;
        } else {
            // otherwise, hide the error message
            classroomLmsUrlError.innerHTML = '';
            classroomLmsUrlError.style.display = 'none';
            return true;
        }
    }

    // a little helper function to see if a string is a proper URL
    function isValidUrl(url) {
        try {
            new URL(url);
            return true; // if it works its valid
        } catch {
            return false; // if it throws an error it's not a valid URL
        }
    }
});