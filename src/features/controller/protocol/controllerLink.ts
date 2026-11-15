import { pico as sharedPico, type Pico } from '@/libs/communication/communicate'
import type { PicoState } from 'src/types/communication'
import {
    CONTROLLER_MODE_COMMAND,
    CONTROLLER_MODE_REPLY,
    HEARTBEAT_MS,
    HostPacket,
    MAX_SPEED,
    MIN_SEND_INTERVAL_MS,
    encodeDrive,
    encodePacket,
} from './packets'

export type LinkState = 'idle' | 'starting' | 'active' | 'closing'

interface LinkEventMap {
    state: LinkState
}

type Listener<K extends keyof LinkEventMap> = (data: LinkEventMap[K]) => void

const now = () => Date.now()

/**
 * The controller's side of the raw link. One-way: the board sends nothing back,
 * and times out by itself if DRIVE stops arriving. DRIVE is latest-value-wins: at
 * most one write is ever on the wire and a newer value replaces an unsent one, so
 * input never queues up behind a slow link.
 */
export class ControllerLink {
    private linkState: LinkState = 'idle'
    private listeners = new Map<keyof LinkEventMap, Set<Listener<never>>>()

    private seq = 0

    private left = 0
    private right = 0
    private driveDirty = false
    private lastDriveSentAt = 0
    /** Zero DRIVEs from `stop()`: always sent before the next throttled DRIVE. */
    private urgent: Uint8Array[] = []
    private inFlight = false

    private heartbeatTimer: ReturnType<typeof setInterval> | null = null
    private throttleTimer: ReturnType<typeof setTimeout> | null = null

    private readonly handlePicoState = (state: PicoState) => {
        if (
            !state.rawMode &&
            this.linkState !== 'idle' &&
            this.linkState !== 'closing'
        ) {
            this.teardown()
        }
    }

    constructor(private readonly pico: Pico = sharedPico) {}

    get state(): LinkState {
        return this.linkState
    }

    get active(): boolean {
        return this.linkState === 'active'
    }

    on<K extends keyof LinkEventMap>(
        event: K,
        listener: Listener<K>,
    ): () => void {
        if (!this.listeners.has(event)) this.listeners.set(event, new Set())
        this.listeners.get(event)!.add(listener as Listener<never>)
        return () =>
            this.listeners.get(event)?.delete(listener as Listener<never>)
    }

    private emit<K extends keyof LinkEventMap>(
        event: K,
        data: LinkEventMap[K],
    ): void {
        this.listeners
            .get(event)
            ?.forEach((listener) => (listener as Listener<K>)(data))
    }

    private setState(state: LinkState): void {
        if (state === this.linkState) return
        this.linkState = state
        this.emit('state', state)
    }

    // === lifecycle ===

    /**
     * Switch the board into controller mode. The board confirms with a framed
     * reply before raw mode starts. Firmware is already checked on connect; the
     * controller ships in the same release.
     */
    async start(): Promise<void> {
        if (this.linkState !== 'idle') return

        this.resetSession()
        this.setState('starting')

        try {
            await this.pico.enterRawMode(
                CONTROLLER_MODE_COMMAND,
                CONTROLLER_MODE_REPLY,
            )
            // Only once raw: from here, leaving raw mode means the link is gone.
            this.pico.on('stateChange', this.handlePicoState)
        } catch (error) {
            this.teardown()
            this.pico.exitRawMode()
            throw error
        }

        this.heartbeatTimer = setInterval(() => this.tick(), HEARTBEAT_MS / 2)
        this.setState('active')
    }

    /** Zero the motors, hand the board back to the framed protocol, and leave raw mode. */
    async close(): Promise<void> {
        if (this.linkState === 'idle' || this.linkState === 'closing') return

        this.setState('closing')
        this.clearTimers()
        this.urgent = []
        this.driveDirty = false

        try {
            // Zero first, so the motors halt even if EXIT is lost.
            await this.pico.writeBytes(encodeDrive(this.nextSeq(), 0, 0))
            await this.pico.writeBytes(
                encodePacket(HostPacket.EXIT, this.nextSeq()),
            )
        } catch {
            // The link is already gone; the board times out and stops the motors.
        }

        this.teardown()
        this.pico.exitRawMode()
    }

    private teardown(): void {
        this.clearTimers()
        this.pico.off('stateChange', this.handlePicoState)
        this.urgent = []
        this.driveDirty = false
        this.inFlight = false
        this.setState('idle')
    }

    private resetSession(): void {
        this.seq = 0
        this.left = 0
        this.right = 0
        this.lastDriveSentAt = 0
    }

    private clearTimers(): void {
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
        if (this.throttleTimer) clearTimeout(this.throttleTimer)
        this.heartbeatTimer = null
        this.throttleTimer = null
    }

    // === driving ===

    /** Speeds are -100..100. Unchanged values are not re-sent until the heartbeat. */
    setDrive(left: number, right: number): void {
        if (!this.active) return

        const nextLeft = clampSpeed(left)
        const nextRight = clampSpeed(right)
        if (nextLeft === this.left && nextRight === this.right) return

        this.left = nextLeft
        this.right = nextRight
        this.driveDirty = true
        this.pump()
    }

    /** Zero the motors now: a DRIVE 0 0 that skips the throttle and any pending DRIVE. */
    stop(): void {
        if (!this.active) return

        this.left = 0
        this.right = 0
        this.driveDirty = false
        this.lastDriveSentAt = now()
        this.urgent.push(encodeDrive(this.nextSeq(), 0, 0))
        this.pump()
    }

    private tick(): void {
        if (now() - this.lastDriveSentAt >= HEARTBEAT_MS) {
            this.driveDirty = true
            this.pump()
        }
    }

    private nextSeq(): number {
        const seq = this.seq
        this.seq = (this.seq + 1) & 0xff
        return seq
    }

    /** Send the next packet if nothing is on the wire. Urgent packets first, then DRIVE at most every MIN_SEND_INTERVAL_MS. */
    private pump(): void {
        if (
            this.inFlight ||
            this.linkState === 'idle' ||
            this.linkState === 'closing'
        )
            return

        let packet = this.urgent.shift()

        if (!packet && this.driveDirty && this.active) {
            const wait = this.lastDriveSentAt + MIN_SEND_INTERVAL_MS - now()
            if (wait > 0) {
                this.throttleTimer ??= setTimeout(() => {
                    this.throttleTimer = null
                    this.pump()
                }, wait)
                return
            }
            this.driveDirty = false
            this.lastDriveSentAt = now()
            packet = encodeDrive(this.nextSeq(), this.left, this.right)
        }

        if (!packet) return

        this.inFlight = true
        this.pico
            .writeBytes(packet)
            .catch(() => {
                // Raw mode ended underneath us; `handlePicoState` tears down.
            })
            .finally(() => {
                this.inFlight = false
                this.pump()
            })
    }
}

function clampSpeed(value: number): number {
    if (!Number.isFinite(value)) return 0
    return Math.max(-MAX_SPEED, Math.min(MAX_SPEED, Math.round(value)))
}

export const controllerLink = new ControllerLink()
