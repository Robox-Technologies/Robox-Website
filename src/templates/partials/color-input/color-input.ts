console.log('Color Input Module Loaded');

const colorInput = document.querySelector('.color-input') as HTMLInputElement;
const colorError = document.querySelector('.color-error') as HTMLElement;

const isValidColor = (color: string): boolean => {
    const valid = new Option().style;
    valid.color = color;
    return valid.color !== '';
};

const handleColorInput = (input: HTMLInputElement, errorElement: HTMLElement) => {
    const color = input.value.trim();

    if (isValidColor(color)) {
        colorError.style.display = 'none';
    } else {
        input.style.borderColor = '';
        colorError.textContent = 'Please use a valid color.';
        colorError.style.display = 'block';
        if (errorElement) {
            errorElement.style.display = 'block';
        }
    }
};

if (colorInput) {
    colorInput.addEventListener('input', () => handleColorInput(colorInput, colorError));
}