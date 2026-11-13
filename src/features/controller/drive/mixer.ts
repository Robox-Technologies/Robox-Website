/** Turns a stick position into left/right motor speeds. */

/** x: -1 (left) .. 1 (right), y: -1 (back) .. 1 (forward). */
export interface StickInput {
    x: number
    y: number
}

export interface MotorSpeeds {
    left: number
    right: number
}

export interface MixOptions {
    /** 0..1 fraction of full speed. */
    maxSpeed: number
    /** 0 is linear; towards 1 gives finer control near the centre. */
    expo: number
    deadzone: number
}

export const DEFAULT_MIX: MixOptions = {
    maxSpeed: 0.6,
    expo: 0.3,
    deadzone: 0.08,
}

export const ZERO_STICK: StickInput = { x: 0, y: 0 }

function clampUnit(value: number): number {
    if (!Number.isFinite(value)) return 0
    return Math.max(-1, Math.min(1, value))
}

/** Rescales so the output still starts at 0 just past the deadzone, rather than jumping. */
export function applyDeadzone(value: number, deadzone: number): number {
    const magnitude = Math.abs(value)
    if (magnitude <= deadzone) return 0
    return (Math.sign(value) * (magnitude - deadzone)) / (1 - deadzone)
}

export function applyExpo(value: number, expo: number): number {
    return (1 - expo) * value + expo * value ** 3
}

/** Arcade drive: y drives both wheels, x adds to one and takes from the other. */
export function arcadeMix(input: StickInput): MotorSpeeds {
    const x = clampUnit(input.x)
    const y = clampUnit(input.y)
    const left = y + x
    const right = y - x
    const scale = Math.max(1, Math.abs(left), Math.abs(right))
    return { left: left / scale, right: right / scale }
}

/** The whole pipeline, out to the -100..100 integers the board takes. */
export function toMotorSpeeds(
    input: StickInput,
    options: MixOptions = DEFAULT_MIX,
): MotorSpeeds {
    const shaped = {
        x: applyExpo(
            applyDeadzone(clampUnit(input.x), options.deadzone),
            options.expo,
        ),
        y: applyExpo(
            applyDeadzone(clampUnit(input.y), options.deadzone),
            options.expo,
        ),
    }
    const { left, right } = arcadeMix(shaped)
    const limit = Math.max(0, Math.min(1, options.maxSpeed)) * 100
    return {
        left: Math.round(left * limit) || 0,
        right: Math.round(right * limit) || 0,
    }
}
