import { createClassroom } from '@root/account'

addEventListener('DOMContentLoaded', () => {
    // Inputs
    const classroomNameInput = document.getElementById('name-input') as HTMLInputElement | null;
    const classroomDescriptionInput = document.getElementById('description-input') as HTMLInputElement | null;
    const classroomYearLevelInput = document.getElementById('year-level-input') as HTMLInputElement | null;
    const classroomClassCodeInput = document.getElementById('class-code-input') as HTMLInputElement | null;
    const classroomLocationInput = document.getElementById('location-input') as HTMLInputElement | null;
    const classroomLmsInput = document.getElementById('lms-input') as HTMLInputElement | null;
    const classroomSecurityInput = document.getElementById('classroom-security') as HTMLInputElement | null;
    const classroomFeaturesInput = document.getElementById('classroom-features') as HTMLInputElement | null;

    // Error ID's
    const classroomNameError = document.getElementById('name-error') as HTMLElement | null;
    const classroomLmsUrlError = document.getElementById('lms-url-error') as HTMLElement | null;

    const createButton = document.getElementById('create-classroom-button');
    if (createButton) {
        createButton.addEventListener('click', async () => {
            console.log('Create button clicked');
            const nameValidation = validateClassroomName();
            const lmsValidation = validateLmsUrl();
            if (nameValidation && lmsValidation) {
                const newClassroom = {
                    name: classroomNameInput?.value || "My Ro/Box Classroom",
                    description: classroomDescriptionInput?.value || null,
                    year_level: classroomYearLevelInput?.value || null,
                    class_code: classroomClassCodeInput?.value || null,
                    location: classroomLocationInput?.value || null,
                    lms_url: (classroomLmsInput?.value.trim() || null),
                    security_level: classroomSecurityInput?.value || 1,
                    features: [classroomFeaturesInput?.value] || null
                };
                console.log('Creating classroom with data:', newClassroom);
                const classroomId = await createClassroom(newClassroom);
                if (classroomId) {
                    window.location.href = `/classroom?id=${classroomId}`;
                }
                else {
                    console.error('Failed to create classroom:', classroomId);
                    alert('Failed to create classroom. Please try again.');
                }
            }
        });
    }

    function validateClassroomName() {
        const name = classroomNameInput.value.trim();
        console.log('Validating classroom name:', name);
        if (!name) {
            console.log('Classroom name is empty');
            classroomNameError.innerHTML = 'Classroom name is required.';
            classroomNameError.style.display = 'block';
            return false;
        } else {
            console.log('Classroom name is valid:', name);
            classroomNameError.innerHTML = '';
            classroomNameError.style.display = 'none';
            return true;
        }
    }

    function validateLmsUrl() {
        const lmsUrl = classroomLmsInput.value.trim();
        console.log('Validating LMS URL:', lmsUrl);
        if (lmsUrl && !isValidUrl(lmsUrl)) {
            console.log('Invalid LMS URL:', lmsUrl);
            classroomLmsUrlError.innerHTML = "Please enter a valid LMS URL. (Make sure you're including http:// or https://)";
            classroomLmsUrlError.style.display = 'block';
            return false;
        } else {
            console.log('LMS URL is valid:', lmsUrl);
            classroomLmsUrlError.innerHTML = '';
            classroomLmsUrlError.style.display = 'none';
            return true;
        }
    }

    function isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    }
});