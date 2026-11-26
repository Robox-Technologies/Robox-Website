import { dispatchStageAdvance } from '@/components/stageFlow'

export type CalibrationStage = 'connect' | 'calibrate'

export function debugCalibration(
    namespace: string,
    message: string,
    details?: unknown,
): void {
    if (typeof details === 'undefined') {
        console.debug(`[Calibration:${namespace}] ${message}`)
    } else {
        console.debug(`[Calibration:${namespace}] ${message}`, details)
    }
}

export function createCalibrationStage(namespace: string) {
    return {
        dispatchAdvance(target: EventTarget, stage: CalibrationStage): void {
            dispatchStageAdvance(target, namespace, stage)
        },
        /** Tells Connect the panel shows the board's values, so it can move on. */
        dispatchReady(target: EventTarget): void {
            target.dispatchEvent(
                new CustomEvent(`${namespace}:calibration-ready`, { bubbles: true }),
            )
        },
    }
}
