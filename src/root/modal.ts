document.addEventListener("DOMContentLoaded", () => {
    const modals:NodeListOf<HTMLDialogElement> = document.querySelectorAll("dialog.modal")
    for (const modal of modals) {
        
        modal.addEventListener("click", (event: MouseEvent) => {
            const element = event?.target as HTMLElement | null
            if (!element) return
            const rect = modal.getBoundingClientRect();
            if (rect.left > event.clientX ||
                rect.right < event.clientX ||
                rect.top > event.clientY ||
                rect.bottom < event.clientY
            ) {
                modal.close();
            }
            event.stopPropagation()
        })
        const cancelButton: NodeListOf<HTMLElement> = modal.querySelectorAll(".close-modal-button")
        if (!cancelButton) return
        for (const button of cancelButton) {
            button.addEventListener("click", (event) => {
                modal.close()
                event.stopPropagation()
            })
        }
    }
})