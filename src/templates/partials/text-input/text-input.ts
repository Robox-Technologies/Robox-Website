function initPasswordToggles(): void {
    const wrappers = document.querySelectorAll<HTMLDivElement>('.input-wrapper');

    wrappers.forEach((wrapper) => {
        const input = wrapper.querySelector<HTMLInputElement>('.text-input');
        const toggle = wrapper.querySelector<HTMLButtonElement>('.toggle-visibility');

        if (!toggle) {
            return;
        }

        const iconShow = toggle.querySelector<HTMLElement>('.eye-icon');
        const iconHide = toggle.querySelector<HTMLElement>('.eye-slash-icon');

        if (!input || !iconShow || !iconHide) {
            console.error('Password toggle elements not found');
            return;
        }

        const showEye = () => {
            iconShow.classList.remove('hidden');
            iconHide.classList.add('hidden');
        };

        const showEyeSlash = () => {
            iconShow.classList.add('hidden');
            iconHide.classList.remove('hidden');
        };

        const revealPassword = (event?: Event) => {
            event?.preventDefault();
            input.type = 'text';
            showEyeSlash();
        };

        const hidePassword = () => {
            input.type = 'password';
            showEye();
            input.focus();
        };

        wrapper.addEventListener('focusin', () => {
            toggle.style.display = 'flex';
        });

        wrapper.addEventListener('focusout', (event) => {
            const relatedTarget = event.relatedTarget as HTMLElement | null;
            if (!relatedTarget || !wrapper.contains(relatedTarget)) {
                toggle.style.display = 'none';
            }
        });

        toggle.addEventListener('pointerdown', revealPassword);
        toggle.addEventListener('pointerup', hidePassword);
        toggle.addEventListener('pointerleave', hidePassword);
        toggle.addEventListener('pointercancel', hidePassword);

        toggle.addEventListener('keyup', hidePassword);

        showEye();
        toggle.style.display = 'none';
    });
}

document.addEventListener('DOMContentLoaded', initPasswordToggles);