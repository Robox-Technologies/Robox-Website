const passwordInput = document.getElementById('password-input') as HTMLInputElement

if (passwordInput) {
    passwordInput.addEventListener('input', () => {
        const value = passwordInput.value
        // Password requirements:
        // At least 8 characters
        const lengthRequirement = 8
        // At least one uppercase letter
        // At least one lowercase letter
        // At least one number
        // At least one special character

        const hasUppercase = /[A-Z]/.test(value)
        const hasLowercase = /[a-z]/.test(value)
        const hasNumber = /\d/.test(value)
        const hasSpecial = /[!@#$%^&*(),.?":{}|<>]_/.test(value)

        const requirements = [
            { id: 'password-length', element: document.getElementById('password-length'), satisfied: value.length >= lengthRequirement },
            { id: 'password-uppercase', element: document.getElementById('password-uppercase'), satisfied: hasUppercase },
            { id: 'password-lowercase', element: document.getElementById('password-lowercase'), satisfied: hasLowercase },
            { id: 'password-number', element: document.getElementById('password-number'), satisfied: hasNumber },
            { id: 'password-special', element: document.getElementById('password-special'), satisfied: hasSpecial }
        ]

        requirements.forEach(({ id, element, satisfied }) => {
            if (!element) {
                return
            }
            element.dataset.satisfied = String(satisfied)
            element.classList.toggle('met', satisfied)
            element.classList.toggle('unmet', !satisfied)

            const iconX = element.querySelector('.fa-xmark')
            const iconCheck = element.querySelector('.fa-check')
            if (iconX) {
                iconX.style.display = satisfied ? 'none' : ''
            }
            if (iconCheck) {
                iconCheck.style.display = satisfied ? '' : 'none'
            }
        })
    });
}