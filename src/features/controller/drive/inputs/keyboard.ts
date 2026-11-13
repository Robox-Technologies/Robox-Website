import { ZERO_STICK, type StickInput } from '../mixer'
import type { InputSource } from './inputSource'

const KEY_AXES: Record<string, Partial<StickInput>> = {
    KeyW: { y: 1 },
    ArrowUp: { y: 1 },
    KeyS: { y: -1 },
    ArrowDown: { y: -1 },
    KeyA: { x: -1 },
    ArrowLeft: { x: -1 },
    KeyD: { x: 1 },
    ArrowRight: { x: 1 },
}

/** Full deflection is reached over this long, so a tap isn't a full-speed lurch. */
const RAMP_MS = 250

function isTyping(target: EventTarget | null): boolean {
    if (!(target instanceof HTMLElement)) return false
    return (
        target.isContentEditable ||
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.tagName === 'SELECT'
    )
}

/** WASD / arrow keys. Ramps up while held; drops straight to zero on release. */
export class KeyboardInput implements InputSource {
    readonly name = 'Keyboard'

    private held = new Set<string>()
    private value: StickInput = ZERO_STICK
    private lastReadAt = performance.now()
    private engagedAt = 0

    private readonly keydown = (event: KeyboardEvent) => {
        if (!(event.code in KEY_AXES) || isTyping(event.target)) return
        event.preventDefault()
        this.held.add(event.code)
        this.engagedAt = performance.now()
    }

    private readonly keyup = (event: KeyboardEvent) => {
        if (!this.held.delete(event.code)) return
        this.engagedAt = performance.now()
    }

    private readonly clear = () => this.held.clear()

    constructor(private readonly target: Window = window) {
        target.addEventListener('keydown', this.keydown)
        target.addEventListener('keyup', this.keyup)
        target.addEventListener('blur', this.clear)
    }

    read(): StickInput {
        const time = performance.now()
        const step = (time - this.lastReadAt) / RAMP_MS
        this.lastReadAt = time

        const goal = { x: 0, y: 0 }
        for (const code of this.held) {
            const axes = KEY_AXES[code]
            goal.x += axes.x ?? 0
            goal.y += axes.y ?? 0
        }
        goal.x = Math.max(-1, Math.min(1, goal.x))
        goal.y = Math.max(-1, Math.min(1, goal.y))

        this.value = {
            x: approach(this.value.x, goal.x, step),
            y: approach(this.value.y, goal.y, step),
        }
        return this.value
    }

    isEngaged(): boolean {
        return this.held.size > 0
    }

    lastEngagedAt(): number {
        return this.isEngaged() ? performance.now() : this.engagedAt
    }

    dispose(): void {
        this.target.removeEventListener('keydown', this.keydown)
        this.target.removeEventListener('keyup', this.keyup)
        this.target.removeEventListener('blur', this.clear)
    }
}

/** Ramps away from zero; slowing down is immediate, and reversing restarts from zero. */
function approach(current: number, goal: number, step: number): number {
    if (goal === 0) return 0
    const from = Math.sign(current) === Math.sign(goal) ? current : 0
    if (Math.abs(goal) <= Math.abs(from)) return goal
    return from + Math.sign(goal) * Math.min(step, Math.abs(goal - from))
}
