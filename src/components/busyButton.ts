/** Swaps a button's icon for a spinner while an async action runs. Needs `.busyIcon`/`.busySpinner`. */
export function setButtonBusy(button: HTMLButtonElement, busy: boolean): void {
    button.disabled = busy
    // `hidden!`, because FontAwesome's `display: inline-block` loads after Tailwind's `.hidden`.
    button.querySelector('.busyIcon')?.classList.toggle('hidden!', busy)
    button.querySelector('.busySpinner')?.classList.toggle('hidden!', !busy)
}
