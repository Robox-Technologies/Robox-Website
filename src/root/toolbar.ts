
const offsetX = 5;
const offsetY = 10;
document.addEventListener("click", (event: MouseEvent) => {
    const item = event.target as HTMLElement | null
    const toolbar = document.querySelector(".toolbar") as HTMLDialogElement | null
    if (!toolbar) return
    if (!item) return
    const rect = toolbar.getBoundingClientRect();
    if (rect.left > event.clientX ||
        rect.right < event.clientX ||
        rect.top > event.clientY ||
        rect.bottom < event.clientY
    ) {
        toolbar.close();
    }
});
window.addEventListener("resize", () => {
    const toolbar = document.querySelector(".toolbar") as HTMLDialogElement | null;
    if (toolbar && toolbar.hasAttribute("open")) {
        const target = document.querySelector(".toolbar-target") as HTMLElement | null;
        if (target) {
            //Update the position of the toolbar
            const rect = target.getBoundingClientRect();
            toolbar.style.position = 'absolute';
            const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
            const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
            toolbar.style.left = `${rect.left + scrollLeft + offsetX}px`;
            toolbar.style.top = `${rect.top + scrollTop + offsetY}px`;

        }
    }
});
document.addEventListener("DOMContentLoaded", () => {
    const toolbarModal = document.querySelector(".toolbar") as HTMLDialogElement | null;
    if (!toolbarModal) return;
    toolbarModal.addEventListener("close", () => {
        const oldTarget = document.querySelector(".toolbar-target") as HTMLElement | null;
        if (oldTarget) {
            oldTarget.classList.remove("toolbar-target");
        }
    });
});

export function toggleToolbar(toolbar: HTMLDialogElement, open: boolean): void {
    if (open) {
        toolbar.show();
    } else {
        toolbar.close();
    }
}

export function moveToolbar(toolbar: HTMLDialogElement, target: HTMLElement, offset: [number, number] = [0, 0]): void {
    const [offsetX2, offsetY2] = offset;
    const oldTarget = document.querySelector(".toolbar-target") as HTMLElement | null;
    if (oldTarget) {
        oldTarget.classList.remove("toolbar-target");
    }
    target.classList.add("toolbar-target");

    const rect = target.getBoundingClientRect();
    toolbar.style.position = 'absolute';
    const scrollLeft = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    toolbar.style.left = `${rect.left + scrollLeft + offsetX + offset[0]}px`;
    toolbar.style.top = `${rect.top + scrollTop + offsetY + offset[1]}px`;
}
