import type { ControllerLink } from '../protocol/controllerLink'
import type { InputSource } from './inputs/inputSource'
import { toMotorSpeeds, type MixOptions, type MotorSpeeds } from './mixer'

export interface DriveFrame extends MotorSpeeds {
    /** The source being followed, or null when nothing is engaged. */
    source: string | null
    stopped: boolean
}

export interface DriveLoopOptions {
    link: ControllerLink
    sources: InputSource[]
    mix: () => MixOptions
    onFrame?: (frame: DriveFrame) => void
}

/**
 * Polls every input once per animation frame and forwards the most recently
 * engaged one to the link. The link drops values that haven't changed, so this
 * can run at display rate without flooding the wire.
 */
export class DriveLoop {
    private frame: number | null = null
    private wasEngaged = false
    /** Set by an emergency stop; holds output at zero until every input is let go. */
    private latched = false

    private readonly visibility = () => {
        if (document.visibilityState === 'hidden') this.emergencyStop()
    }

    constructor(private readonly options: DriveLoopOptions) {}

    start(): void {
        if (this.frame !== null) return
        document.addEventListener('visibilitychange', this.visibility)
        window.addEventListener('pagehide', this.visibility)
        const loop = () => {
            this.step()
            this.frame = requestAnimationFrame(loop)
        }
        this.frame = requestAnimationFrame(loop)
    }

    stop(): void {
        if (this.frame !== null) cancelAnimationFrame(this.frame)
        this.frame = null
        document.removeEventListener('visibilitychange', this.visibility)
        window.removeEventListener('pagehide', this.visibility)
        this.options.link.stop()
    }

    emergencyStop(): void {
        this.latched = true
        this.wasEngaged = false
        this.options.link.stop()
        this.options.onFrame?.({
            left: 0,
            right: 0,
            source: null,
            stopped: true,
        })
    }

    private step(): void {
        const { link, sources, mix, onFrame } = this.options

        let leader: InputSource | null = null
        let leaderValue = { x: 0, y: 0 }
        for (const source of sources) {
            const value = source.read()
            if (!source.isEngaged()) continue
            if (!leader || source.lastEngagedAt() > leader.lastEngagedAt()) {
                leader = source
                leaderValue = value
            }
        }

        if (this.latched) {
            if (leader) return
            this.latched = false
        }

        if (!leader) {
            if (this.wasEngaged) link.stop()
            this.wasEngaged = false
            onFrame?.({ left: 0, right: 0, source: null, stopped: false })
            return
        }

        this.wasEngaged = true
        const speeds = toMotorSpeeds(leaderValue, mix())
        link.setDrive(speeds.left, speeds.right)
        onFrame?.({ ...speeds, source: leader.name, stopped: false })
    }
}
