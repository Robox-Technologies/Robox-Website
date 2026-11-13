import type { StickInput } from '../mixer'

/** One way of steering. The drive loop polls every source each frame and follows the most recently active one. */
export interface InputSource {
    readonly name: string
    /** Current stick position. Polled once per animation frame. */
    read(): StickInput
    /** True while the user is holding this input away from centre. */
    isEngaged(): boolean
    /** When this source was last engaged, in `performance.now()` time. */
    lastEngagedAt(): number
    dispose(): void
}
