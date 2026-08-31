import { setButtonBusy } from '@/components/busyButton'
import { dispatchStageAdvance, dispatchStageClearError, dispatchStageError } from '@/components/stageFlow'

export type Stage = 'connect' | 'calibrate' | 'done'

export const STAGES: Stage[] = ['connect', 'calibrate', 'done']

/** Narrows an arbitrary value (a URL param, a `history.state` field) to a real `Stage`. */
export function isStage(value: unknown): value is Stage {
    return typeof value === 'string' && (STAGES as string[]).includes(value)
}

export const STAGE_LABELS: Record<Stage, string> = {
    connect: 'Connect',
    calibrate: 'Calibrate',
    done: 'Done',
}

const NAMESPACE = 'colorcalibration'

// Stage components report progress upward by dispatching these on their own
// root (bubbles: true), so the colorCalibration orchestrator — an ancestor in
// the DOM — can react without knowing anything about the component internally.
export function dispatchCalibrationAdvance(target: EventTarget, stage: Stage): void {
    dispatchStageAdvance(target, NAMESPACE, stage)
}

export function dispatchCalibrationError(target: EventTarget, title: string, message: string): void {
    dispatchStageError(target, NAMESPACE, title, message)
}

export function dispatchCalibrationClearError(target: EventTarget): void {
    dispatchStageClearError(target, NAMESPACE)
}

export { setButtonBusy }
