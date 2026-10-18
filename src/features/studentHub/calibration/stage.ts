import {
    dispatchStageAdvance,
    dispatchStageClearError,
    dispatchStageError,
} from '@/components/stageFlow'

function createStageFeature<S extends string>(
    namespace: string,
    stages: readonly S[],
    stageLabels: Record<S, string>,
) {
    return {
        stages,
        stageLabels,
        isStage(value: unknown): value is S {
            return (
                typeof value === 'string' &&
                (stages as readonly string[]).includes(value)
            )
        },
        dispatchAdvance(target: EventTarget, stage: S): void {
            dispatchStageAdvance(target, namespace, stage)
        },
        dispatchError(
            target: EventTarget,
            title: string,
            message: string,
        ): void {
            dispatchStageError(target, namespace, title, message)
        },
        dispatchClearError(target: EventTarget): void {
            dispatchStageClearError(target, namespace)
        },
    }
}

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

export const CALIBRATION_STAGES: CalibrationStage[] = [
    'connect',
    'calibrate',
]

export const CALIBRATION_STAGE_LABELS: Record<
    CalibrationStage,
    string
> = {
    connect: 'Connect',
    calibrate: 'Calibrate',
}

export function createCalibrationStage(namespace: string) {
    const calibrationReadyEvent = `${namespace}:calibration-ready`
    const stage = createStageFeature(
        namespace,
        CALIBRATION_STAGES,
        CALIBRATION_STAGE_LABELS,
    )

    return {
        ...stage,
        calibrationReadyEvent,
        dispatchReady(target: EventTarget): void {
            target.dispatchEvent(
                new CustomEvent(calibrationReadyEvent, { bubbles: true }),
            )
        },
    }
}
