export function showNotification(text: string, status: 'success' | 'error' | 'info', position: 'top' | 'bottom' = 'bottom', time: false | number = 5) {
    const notification = document.getElementById("notification");
    if (notification) {
        notification.style.cssText = '';
        notification.style.display = 'block';
        notification.classList.remove('success', 'error', 'info', 'top', 'bottom');
        notification.classList.add(status, position);
        
        const messageElem = notification.querySelector('.notification-message');
        if (messageElem) {
            messageElem.textContent = text;
        }
        notification.style.opacity = '1';
        if (time) {
            setTimeout(() => {
            notification.style.opacity = '0';
            const cleanup = () => {
                notification.style.display = 'none';
                notification.removeEventListener('transitionend', cleanup);
            };
            notification.addEventListener('transitionend', cleanup);
            }, time * 1000);
        }
    }
}