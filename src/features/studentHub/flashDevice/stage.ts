import { setButtonBusy } from '@/components/busyButton'
import { dispatchStageAdvance, dispatchStageClearError, dispatchStageError } from '@/components/stageFlow'

export type Stage = 'bootloader' | 'flash' | 'done'

export const STAGES: Stage[] = ['bootloader', 'flash', 'done']

/** Narrows an arbitrary value (a URL param, a `history.state` field) to a real `Stage`. */
export function isStage(value: unknown): value is Stage {
    return typeof value === 'string' && (STAGES as string[]).includes(value)
}

export const STAGE_LABELS: Record<Stage, string> = {
    bootloader: 'Bootloader',
    flash: 'Flash',
    done: 'Done',
}

const NAMESPACE = 'flashdevice'

// Dispatched on the component's own root and bubbled, so the orchestrator can react
// without knowing anything about the component.
export function dispatchFlashAdvance(target: EventTarget, stage: Stage): void {
    dispatchStageAdvance(target, NAMESPACE, stage)
}

export function dispatchFlashError(target: EventTarget, title: string, message: string): void {
    dispatchStageError(target, NAMESPACE, title, message)
}

export function dispatchFlashClearError(target: EventTarget): void {
    dispatchStageClearError(target, NAMESPACE)
}

export { setButtonBusy }

/** Shows the FlashProgress bar in `root` and resets it to 0, so a retry starts over. */
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
