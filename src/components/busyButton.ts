/**
 * Toggles a button between its idle icon and a spinner while an async action
 * (a firmware write, a hardware calibration request, ...) is in flight.
 * Shared by any flow that drives its own button state this way — pair with a
 * `.busyIcon`/`.busySpinner` icon inside the button.
 */
export function setButtonBusy(button: HTMLButtonElement, busy: boolean): void {
    button.disabled = busy
    // `hidden!` (not `hidden`): FontAwesome's own stylesheet sets
    // `.svg-inline--fa { display: inline-block }` at the same specificity as
    // Tailwind's `.hidden`, and it loads after Tailwind in global.css, so a
    // plain `hidden` toggle on an icon/spinner never actually hides it.
    button.querySelector('.busyIcon')?.classList.toggle('hidden!', busy)
    button.querySelector('.busySpinner')?.classList.toggle('hidden!', !busy)
}
