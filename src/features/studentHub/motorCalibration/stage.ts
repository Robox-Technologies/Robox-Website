import { setButtonBusy } from '@/components/busyButton'
import {
    dispatchStageAdvance,
    dispatchStageClearError,
    dispatchStageError,
} from '@/components/stageFlow'

export type Stage = 'connect' | 'calibrate'

export const STAGES: Stage[] = ['connect', 'calibrate']

/** Narrows an arbitrary value (a URL param, a `history.state` field) to a real `Stage`. */
export function isStage(value: unknown): value is Stage {
    return typeof value === 'string' && (STAGES as string[]).includes(value)
}

export const STAGE_LABELS: Record<Stage, string> = {
    connect: 'Connect',
    calibrate: 'Calibrate',
}

const NAMESPACE = 'motorcalibration'

// Stage components report progress upward by dispatching these on their own
// root (bubbles: true), so the motorCalibration orchestrator — an ancestor in
// the DOM — can react without knowing anything about the component internally.
export function dispatchCalibrationAdvance(
    target: EventTarget,
    stage: Stage,
): void {
    dispatchStageAdvance(target, NAMESPACE, stage)
}

export function dispatchCalibrationError(
    target: EventTarget,
    title: string,
    message: string,
): void {
    dispatchStageError(target, NAMESPACE, title, message)
}

export function dispatchCalibrationClearError(target: EventTarget): void {
    dispatchStageClearError(target, NAMESPACE)
}

/**
 * Fired by the Calibrate stage's own script once it has applied a fetched
 * calibration value to its controls. Bubbling, not a plain pico event,
 * because the Connect stage - a DOM sibling, not an ancestor - needs to hear
 * it too: it holds off advancing until this fires, so the panel is never
 * revealed still showing its default "nothing calibrated" state.
 */
export const CALIBRATION_READY_EVENT = `${NAMESPACE}:calibration-ready`

export function dispatchCalibrationReady(target: EventTarget): void {
    target.dispatchEvent(new CustomEvent(CALIBRATION_READY_EVENT, { bubbles: true }))
}

export { setButtonBusy }
