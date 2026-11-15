import { ZERO_STICK, type StickInput } from '../mixer'
import type { InputSource } from './inputSource'

/** Below this the stick counts as resting; cheap pads rarely centre at exactly 0. */
const ENGAGE_THRESHOLD = 0.15

/**
 * How long a pad may vanish before it counts as gone. PlayStation pads on macOS
 * briefly disconnect and reconnect even over USB; holding the last reading
 * across the blip keeps the robot from stuttering to a stop.
 */
export const DROPOUT_GRACE_MS = 300

/** Standard mapping: axes 0/1 are the left stick, 2/3 the right. */
const THROTTLE_AXIS = 1
const STEERING_AXIS = 2

/** Left stick up/down is throttle, right stick left/right is steering. */
export class GamepadInput implements InputSource {
    readonly name = 'Gamepad'

    private engagedAt = 0
    private value: StickInput = ZERO_STICK
    /** The pad being followed, so a reconnect doesn't switch to another device. */
    private padId: string | null = null
    private lastSeenAt = -Infinity

    constructor(
        private readonly getGamepads: () => (Gamepad | null)[] = () =>
            typeof navigator.getGamepads === 'function'
                ? navigator.getGamepads()
                : [],
    ) {}

    read(): StickInput {
        const time = performance.now()
        const pad = this.pad()

        if (pad) {
            this.padId = pad.id
            this.lastSeenAt = time
            this.value = {
                x: pad.axes[STEERING_AXIS] ?? 0,
                y: -(pad.axes[THROTTLE_AXIS] ?? 0),
            }
        } else if (time - this.lastSeenAt > DROPOUT_GRACE_MS) {
            this.value = ZERO_STICK
        }

        if (this.isEngaged()) this.engagedAt = time
        return this.value
    }

    isEngaged(): boolean {
        return Math.hypot(this.value.x, this.value.y) > ENGAGE_THRESHOLD
    }

    lastEngagedAt(): number {
        return this.engagedAt
    }

    /** The pad's name for the UI, kept through a brief drop-out. */
    connectedName(): string | null {
        const pad = this.pad()
        if (pad) return pad.id
        const recent = performance.now() - this.lastSeenAt <= DROPOUT_GRACE_MS
        return recent ? this.padId : null
    }

    /** The pad followed so far if it's still there, else a standard-mapped pad, else any. */
    private pad(): Gamepad | null {
        const pads = this.getGamepads().filter(
            (pad): pad is Gamepad => pad?.connected === true,
        )
        return (
            pads.find((pad) => pad.id === this.padId) ??
            pads.find((pad) => pad.mapping === 'standard') ??
            pads[0] ??
            null
        )
    }

    dispose(): void {}
}
