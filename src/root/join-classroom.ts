import { joinClassroom } from "@root/account";

function initClassCodeInputs() {
    const inputs: HTMLInputElement[] = Array.from(document.querySelectorAll('.digit-input'));
    if (!inputs.length) return;

    const hidden = document.getElementById('classroom-code-value') as HTMLInputElement | null;

    function sanitize(str: string): string {
        return str.replace(/\D/g, '');
    }

    function updateHidden() {
        if (hidden) hidden.value = inputs.map(i => i.value).join('');
    }

    function fillFromIndex(startIndex: number, chars: string) {
        let index = startIndex;
        for (const char of chars) {
            if (index >= inputs.length) break;
            inputs[index].value = char;
            index++;
        }
        updateHidden();
        const nextEmpty = inputs.find(i => i.value === '');
        if (nextEmpty) {
            nextEmpty.focus();
            nextEmpty.select();
        } else {
            inputs[Math.min(index - 1, inputs.length - 1)].focus();
            inputs[Math.min(index - 1, inputs.length - 1)].select();
        }
    }

    inputs.forEach((input, index) => {
        // on paste
        input.addEventListener('paste', e => {
            e.preventDefault();
            const pasted = (e.clipboardData || (window as any).clipboardData).getData('text');
            const chars = sanitize(pasted).slice(0, inputs.length);
            if (!chars) return;
            fillFromIndex(0, chars);
        });

        // on input
        input.addEventListener('input', e => {
            const raw = (e.target as HTMLInputElement).value;
            const chars = sanitize(raw);
            (e.target as HTMLInputElement).value = '';
            if (!chars) {
                updateHidden();
                return;
            }
            fillFromIndex(index, chars);
        });

        // on key press
        input.addEventListener('keydown', e => {
            if (e.key === 'Backspace') {
                if (input.value === '') {
                    if (index > 0) {
                        const prev = inputs[index - 1];
                        prev.focus();
                        prev.select();
                        prev.value = '';
                        updateHidden();
                    }
                } else {
                    input.value = '';
                    updateHidden();
                }
            } else if (e.key === 'ArrowLeft' && index > 0) {
                inputs[index - 1].focus();
                inputs[index - 1].select();
            } else if (e.key === 'ArrowRight' && index < inputs.length - 1) {
                inputs[index + 1].focus();
                inputs[index + 1].select();
            }
        });

        // on focus
        input.addEventListener('focus', () => {
            setTimeout(() => input.select(), 0);
        });
    });

    const paramCode = new URLSearchParams(window.location.search).get('classcode');
    if (paramCode) {
        const cleaned = sanitize(paramCode).slice(0, inputs.length);
        if (cleaned) fillFromIndex(0, cleaned);
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        initClassCodeInputs();
        initJoinButton();
    });
} else {
    initJoinButton();
    initClassCodeInputs();
}

function getClassCodeInputs() {
    const inputs = Array.from(document.querySelectorAll('.digit-input')) as HTMLInputElement[];
    return inputs.map(i => i.value).join('');
}

function initJoinButton() {
    const joinClassroomButton = document.getElementById('join-classroom-button');
    if (!joinClassroomButton) {
        return;
    }
    joinClassroomButton.addEventListener('click', async () => {
        const classCode = getClassCodeInputs();
        joinClassroom(classCode);
    });
    return;
}