import { ZERO_STICK, type StickInput } from '../mixer'
import type { InputSource } from './inputSource'

/** Locks the stick to one axis, e.g. a throttle that only slides up and down. */
export type StickAxis = 'x' | 'y'

/** On-screen stick: drag the knob within the base. Snaps back to centre on release. */
export class JoystickInput implements InputSource {
    readonly name = 'Joystick'

    private value: StickInput = ZERO_STICK
    private pointerId: number | null = null
    private engagedAt = 0

    private readonly down = (event: PointerEvent) => this.handleDown(event)
    private readonly move = (event: PointerEvent) => this.handleMove(event)
    private readonly up = (event: PointerEvent) => this.handleUp(event)

    constructor(
        private readonly base: HTMLElement,
        private readonly knob: HTMLElement,
        private readonly axis: StickAxis | null = null,
    ) {
        base.addEventListener('pointerdown', this.down)
        base.addEventListener('pointermove', this.move)
        base.addEventListener('pointerup', this.up)
        base.addEventListener('pointercancel', this.up)
        base.addEventListener('lostpointercapture', this.up)
    }

    read(): StickInput {
        return this.value
    }

    isEngaged(): boolean {
        return this.pointerId !== null
    }

    lastEngagedAt(): number {
        return this.isEngaged() ? performance.now() : this.engagedAt
    }

    /** Snap back without a pointer event, e.g. on an emergency stop. */
    release(): void {
        if (
            this.pointerId !== null &&
            this.base.hasPointerCapture(this.pointerId)
        ) {
            this.base.releasePointerCapture(this.pointerId)
        }
        this.pointerId = null
        this.setValue(ZERO_STICK)
    }

    private handleDown(event: PointerEvent): void {
        if (this.pointerId !== null) return
        event.preventDefault()
        this.pointerId = event.pointerId
        this.base.setPointerCapture(event.pointerId)
        this.engagedAt = performance.now()
        this.base.dataset.engaged = 'true'
        this.handleMove(event)
    }

    private handleMove(event: PointerEvent): void {
        if (event.pointerId !== this.pointerId) return

        const rect = this.base.getBoundingClientRect()
        const radius = this.axis
            ? Math.max(rect.width, rect.height) / 2
            : Math.min(rect.width, rect.height) / 2
        let dx = (event.clientX - (rect.left + rect.width / 2)) / radius
        let dy = (event.clientY - (rect.top + rect.height / 2)) / radius
        if (this.axis === 'x') dy = 0
        if (this.axis === 'y') dx = 0

        const distance = Math.hypot(dx, dy)
        if (distance > 1) {
            dx /= distance
            dy /= distance
        }

        this.engagedAt = performance.now()
        this.setValue({ x: dx, y: -dy })
    }

    private handleUp(event: PointerEvent): void {
        if (event.pointerId !== this.pointerId) return
        this.pointerId = null
        this.engagedAt = performance.now()
        this.setValue(ZERO_STICK)
    }

    private setValue(value: StickInput): void {
        this.value = value
        if (value === ZERO_STICK) delete this.base.dataset.engaged

        // Knob travel stops short of the rim so it stays inside the base.
        const travelX = (this.base.clientWidth - this.knob.offsetWidth) / 2
        const travelY = (this.base.clientHeight - this.knob.offsetHeight) / 2
        this.knob.style.transform = `translate(${value.x * travelX}px, ${-value.y * travelY}px)`
    }

    dispose(): void {
        this.release()
        this.base.removeEventListener('pointerdown', this.down)
        this.base.removeEventListener('pointermove', this.move)
        this.base.removeEventListener('pointerup', this.up)
        this.base.removeEventListener('pointercancel', this.up)
        this.base.removeEventListener('lostpointercapture', this.up)
    }
}
