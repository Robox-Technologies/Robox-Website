import { ZERO_STICK, type StickInput } from '../mixer'
import type { InputSource } from './inputSource'

/** Below this the stick counts as resting; cheap pads rarely centre at exactly 0. */
const ENGAGE_THRESHOLD = 0.15

/** Left stick of the first connected gamepad, via the standard mapping. */
export class GamepadInput implements InputSource {
    readonly name = 'Gamepad'

    private engagedAt = 0
    private value: StickInput = ZERO_STICK

    read(): StickInput {
        const pad = this.pad()
        if (!pad) {
            this.value = ZERO_STICK
            return this.value
        }

        this.value = { x: pad.axes[0] ?? 0, y: -(pad.axes[1] ?? 0) }
        if (this.isEngaged()) this.engagedAt = performance.now()
        return this.value
    }

    isEngaged(): boolean {
        return Math.hypot(this.value.x, this.value.y) > ENGAGE_THRESHOLD
    }

    lastEngagedAt(): number {
        return this.engagedAt
    }

    /** The connected pad's name, for the UI. */
    connectedName(): string | null {
        return this.pad()?.id ?? null
    }

    private pad(): Gamepad | null {
        if (typeof navigator.getGamepads !== 'function') return null
        return navigator.getGamepads().find((pad) => pad?.connected) ?? null
    }

    dispose(): void {}
}
