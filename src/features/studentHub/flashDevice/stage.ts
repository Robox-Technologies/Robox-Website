export type Stage = 'bootloader' | 'flash' | 'done'

export const STAGES: Stage[] = ['bootloader', 'flash', 'done']

export const STAGE_LABELS: Record<Stage, string> = {
    bootloader: 'Bootloader',
    flash: 'Flash',
    done: 'Done',
}

// Stage components report progress upward by dispatching these on their own
// root (bubbles: true), so the flashDevice orchestrator — an ancestor in the
// DOM — can react without knowing anything about the component internally.
export function dispatchFlashAdvance(target: EventTarget, stage: Stage): void {
    target.dispatchEvent(
        new CustomEvent('flashdevice:advance', { detail: { stage }, bubbles: true }),
    )
}

export function dispatchFlashError(
    target: EventTarget,
    title: string,
    message: string,
): void {
    target.dispatchEvent(
        new CustomEvent('flashdevice:error', { detail: { title, message }, bubbles: true }),
    )
}

export function dispatchFlashClearError(target: EventTarget): void {
    target.dispatchEvent(new CustomEvent('flashdevice:clear-error', { bubbles: true }))
}

export function setButtonBusy(button: HTMLButtonElement, busy: boolean): void {
    button.disabled = busy
    // `hidden!` (not `hidden`): FontAwesome's own stylesheet sets
    // `.svg-inline--fa { display: inline-block }` at the same specificity as
    // Tailwind's `.hidden`, and it loads after Tailwind in global.css, so a
    // plain `hidden` toggle on an icon/spinner never actually hides it.
    button.querySelector('.flashDeviceIcon')?.classList.toggle('hidden!', busy)
    button.querySelector('.flashDeviceSpinner')?.classList.toggle('hidden!', !busy)
}

/**
 * Shows the FlashProgress bar nested in `root` and resets it to 0 — called
 * once, right before the first chunk write, so a retry after a failed
 * attempt doesn't pick up where the last one left off.
 */
export function showFlashProgress(root: ParentNode): void {
    root.querySelector<HTMLElement>('.flashProgress')?.classList.remove('hidden')
    setFlashProgress(root, 0)
}

export function hideFlashProgress(root: ParentNode): void {
    root.querySelector<HTMLElement>('.flashProgress')?.classList.add('hidden')
}

/** `percent` is 0-100; the caller (a chunked firmware write) reports real
 * transfer progress, not a simulated timer. */
export function setFlashProgress(root: ParentNode, percent: number): void {
    const progress = root.querySelector<HTMLElement>('.flashProgress')
    if (!progress) return
    const clamped = Math.min(100, Math.max(0, Math.round(percent)))
    progress.setAttribute('aria-valuenow', String(clamped))
    const fill = progress.querySelector<HTMLDivElement>('.flashProgressFill')
    const label = progress.querySelector<HTMLSpanElement>('.flashProgressPercent')
    if (fill) fill.style.width = `${clamped}%`
    if (label) label.textContent = String(clamped)
}

