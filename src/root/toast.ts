import "@partials/toast/toast.scss";
import * as sanitizeHtml from 'sanitize-html';

const toastStyles = {
    "error": {
        "background-color": "#f44336",
        "icon": "bi-x-circle",
    },
    "success": {
        "background-color": "#4CAF50",
        "icon": "bi-check-circle"
    },
    "info": {
        "background-color": "#2196F3",
        "icon": "bi-info-circle"
    },
    "warning": {
        "background-color": "#ff9800",
        "icon": "bi-exclamation-circle"
    }
}
document.addEventListener("DOMContentLoaded", () => {
    let toastHolder = document.getElementById('toast-holder');
    if (!toastHolder) {
        toastHolder = document.createElement('div');
        toastHolder.id = 'toast-holder';
        document.body.appendChild(toastHolder);
    }
});

export function showToast(type: keyof typeof toastStyles, title: string, message: string, duration: number | 'infinite' = 'infinite') {
    const toastHolder = document.getElementById('toast-holder');
    const style = toastStyles[type];
    const toast = document.createElement('div');
    toast.className = 'toast-container';
    toast.innerHTML = `
        <div class="toast" style="background-color: ${style["background-color"]};">
            <div class="toast-header">
                <i class="toast-icon bi ${style.icon}"></i>
                <h1 class="toast-title">${title}</h1>
                <button class="toast-close-button" onclick="closeToast()">
                    <i class="bi bi-x-circle"></i>
                </button>
            </div>
            <div class="toast-content">
                ${sanitizeHtml(message)}
            </div>
            
        </div>
    `;
    function closeToast() {
        toast.remove();
    }
    toastHolder?.appendChild(toast);

    if (duration !== 'infinite') {
        setTimeout(() => {
            closeToast();
        }, duration);
    }
}