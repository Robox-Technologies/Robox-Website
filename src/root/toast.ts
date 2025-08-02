import "@partials/toast/toast.scss";


const toastStyles = {
    "error": {
        "background-color": "#f44336",
        "icon": "fa-circle-xmark",
    },
    "success": {
        "background-color": "#4CAF50",
        "icon": "fa-circle-check"
    },
    "info": {
        "background-color": "#2196F3",
        "icon": "fa-circle-info"
    },
    "warning": {
        "background-color": "#ff9800",
        "icon": "fa-circle-exclamation"
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

export function showToast(type: keyof typeof toastStyles, title: string, message: string, duration = 3000) {
    const toastHolder = document.getElementById('toast-holder');
    const style = toastStyles[type];
    const toast = document.createElement('div');
    toast.className = 'toast-container';
    toast.innerHTML = `
        <div class="toast" style="background-color: ${style["background-color"]};">
            <div class="toast-header">
                <i class="toast-icon fa-solid ${style.icon}"></i>
                <h1 class="toast-title">${title}</h1>
                <button class="toast-close-button" onclick="this.closest('.toast-container').remove()">
                    <i class="fa-solid fa-xmark"></i>
                </button>
            </div>
            <div class="toast-content">
                ${message}
            </div>
            
        </div>
    `;
    toastHolder?.appendChild(toast);

    setTimeout(() => {
        toast.remove();
    }, duration);
}