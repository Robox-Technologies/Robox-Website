import type { StickInput } from '../mixer'
import type { InputSource } from './inputSource'
import type { JoystickInput } from './joystick'

/** Two on-screen sticks laid out like a gamepad: one throttles, the other steers. */
export class DualStickInput implements InputSource {
    readonly name = 'Touch controller'

    constructor(
        private readonly throttle: JoystickInput,
        private readonly steering: JoystickInput,
    ) {}

    read(): StickInput {
        return { x: this.steering.read().x, y: this.throttle.read().y }
    }

    isEngaged(): boolean {
        return this.throttle.isEngaged() || this.steering.isEngaged()
    }

    lastEngagedAt(): number {
        return Math.max(
            this.throttle.lastEngagedAt(),
            this.steering.lastEngagedAt(),
        )
    }

    release(): void {
        this.throttle.release()
        this.steering.release()
    }

    dispose(): void {
        this.throttle.dispose()
        this.steering.dispose()
    }
}
