import { pico as sharedPico, type Pico } from '@/libs/communication/communicate'
import { meetsMinimumVersion } from '@/libs/communication/protocol'
import type { PicoState } from 'src/types/communication'
import {
    BoardPacket,
    CONTROLLER_MODE_COMMAND,
    CONTROLLER_PROTOCOL_VERSION,
    HANDSHAKE_PING_INTERVAL_MS,
    HANDSHAKE_TIMEOUT_MS,
    HEARTBEAT_MS,
    HostPacket,
    LINK_TIMEOUT_MS,
    MAX_SPEED,
    MINIMUM_CONTROLLER_FIRMWARE,
    MIN_SEND_INTERVAL_MS,
    PING_INTERVAL_MS,
    PacketReader,
    StatusFlag,
    encodeDrive,
    encodePacket,
    type Packet,
} from './packets'

export type LinkState =
    'idle' | 'starting' | 'active' | 'unresponsive' | 'closing'

export interface LinkStats {
    /** Last PING round trip. */
    rttMs: number | null
    /** Share of packets the board didn't count, over the last STATUS window. */
    lossPercent: number | null
    watchdogTripped: boolean
    packetsSent: number
}

interface LinkEventMap {
    state: LinkState
    stats: LinkStats
}

type Listener<K extends keyof LinkEventMap> = (data: LinkEventMap[K]) => void

const now = () => Date.now()

/**
 * The controller's side of the raw link. DRIVE is latest-value-wins: at most one
 * write is ever on the wire and a newer value replaces an unsent one, so input
 * never queues up behind a slow link.
 */
export class ControllerLink {
    private linkState: LinkState = 'idle'
    private readonly reader = new PacketReader()
    private listeners = new Map<keyof LinkEventMap, Set<Listener<never>>>()

    private seq = 0
    private packetsSent = 0

    private left = 0
    private right = 0
    private driveDirty = false
    private lastDriveSentAt = 0
    /** STOP/PING/EXIT: always sent before the next DRIVE. */
    private urgent: Uint8Array[] = []
    private inFlight = false

    private heartbeatTimer: ReturnType<typeof setInterval> | null = null
    private pingTimer: ReturnType<typeof setInterval> | null = null
    private throttleTimer: ReturnType<typeof setTimeout> | null = null

    private pingSentAt = new Map<number, number>()
    private lastHeardAt = 0
    private rttMs: number | null = null
    private lossPercent: number | null = null
    private watchdogTripped = false
    private lastStatus: { received: number; sent: number } | null = null

    private onPong: ((packet: Packet) => void) | null = null

    private readonly handleRaw = (data: Uint8Array) => {
        for (const packet of this.reader.feed(data)) this.handlePacket(packet)
    }

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
        return this.linkState === 'active' || this.linkState === 'unresponsive'
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

    stats(): LinkStats {
        return {
            rttMs: this.rttMs,
            lossPercent: this.lossPercent,
            watchdogTripped: this.watchdogTripped,
            packetsSent: this.packetsSent,
        }
    }

    // === lifecycle ===

    /** Switch the board into controller mode and wait for it to answer. */
    async start(): Promise<void> {
        if (this.linkState !== 'idle') return

        const { firmwareVersion } = this.pico.getState()
        if (
            !meetsMinimumVersion(firmwareVersion, MINIMUM_CONTROLLER_FIRMWARE)
        ) {
            throw new Error(
                `This Ro/Box is running firmware ${firmwareVersion}. The controller needs ${MINIMUM_CONTROLLER_FIRMWARE} or newer, so please update it first.`,
            )
        }

        this.resetSession()
        this.setState('starting')
        this.pico.on('raw', this.handleRaw)

        try {
            await this.pico.enterRawMode(CONTROLLER_MODE_COMMAND)
            // Only once raw: from here, leaving raw mode means the link is gone.
            this.pico.on('stateChange', this.handlePicoState)
            await this.handshake()
        } catch (error) {
            this.teardown()
            this.pico.exitRawMode()
            throw error
        }

        this.lastHeardAt = now()
        this.heartbeatTimer = setInterval(() => this.tick(), HEARTBEAT_MS / 2)
        this.pingTimer = setInterval(() => this.ping(), PING_INTERVAL_MS)
        this.setState('active')
    }

    /** PING until a PONG arrives. Repeated, because the first may land before the board has switched over. */
    private handshake(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            const interval = setInterval(
                () => this.ping(),
                HANDSHAKE_PING_INTERVAL_MS,
            )
            const timeout = setTimeout(() => {
                finish()
                reject(
                    new Error(
                        "This Ro/Box didn't answer the controller. Make sure its firmware is up to date, then try again.",
                    ),
                )
            }, HANDSHAKE_TIMEOUT_MS)

            const finish = () => {
                clearInterval(interval)
                clearTimeout(timeout)
                this.onPong = null
            }

            this.onPong = (packet) => {
                finish()
                if (packet.b !== CONTROLLER_PROTOCOL_VERSION) {
                    reject(
                        new Error(
                            `This Ro/Box speaks controller protocol ${packet.b}, but this page needs ${CONTROLLER_PROTOCOL_VERSION}. Update the Ro/Box or refresh the page.`,
                        ),
                    )
                    return
                }
                resolve()
            }

            this.ping()
        })
    }

    /** Stop, hand the board back to the framed protocol, and leave raw mode. */
    async close(): Promise<void> {
        if (this.linkState === 'idle' || this.linkState === 'closing') return

        this.setState('closing')
        this.clearTimers()
        this.urgent = []
        this.driveDirty = false

        try {
            await this.pico.writeBytes(
                encodePacket(HostPacket.STOP, this.nextSeq()),
            )
            await this.pico.writeBytes(
                encodePacket(HostPacket.EXIT, this.nextSeq()),
            )
        } catch {
            // The link is already gone; the board's watchdog stops the motors.
        }

        this.teardown()
        this.pico.exitRawMode()
    }

    private teardown(): void {
        this.clearTimers()
        this.pico.off('raw', this.handleRaw)
        this.pico.off('stateChange', this.handlePicoState)
        this.onPong = null
        this.urgent = []
        this.driveDirty = false
        this.inFlight = false
        this.setState('idle')
    }

    private resetSession(): void {
        this.reader.reset()
        this.seq = 0
        this.packetsSent = 0
        this.left = 0
        this.right = 0
        this.lastDriveSentAt = 0
        this.pingSentAt.clear()
        this.rttMs = null
        this.lossPercent = null
        this.watchdogTripped = false
        this.lastStatus = null
    }

    private clearTimers(): void {
        if (this.heartbeatTimer) clearInterval(this.heartbeatTimer)
        if (this.pingTimer) clearInterval(this.pingTimer)
        if (this.throttleTimer) clearTimeout(this.throttleTimer)
        this.heartbeatTimer = null
        this.pingTimer = null
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

    /** Zero the motors now, ahead of any pending DRIVE. */
    stop(): void {
        if (!this.active) return

        this.left = 0
        this.right = 0
        this.driveDirty = false
        this.lastDriveSentAt = now()
        this.urgent.push(encodePacket(HostPacket.STOP, this.nextSeq()))
        this.pump()
    }

    private ping(): void {
        const seq = this.nextSeq()
        this.pingSentAt.set(seq, now())
        this.urgent.push(encodePacket(HostPacket.PING, seq))
        this.pump()
    }

    private tick(): void {
        if (now() - this.lastDriveSentAt >= HEARTBEAT_MS) {
            this.driveDirty = true
            this.pump()
        }

        const silent = now() - this.lastHeardAt > LINK_TIMEOUT_MS
        if (silent && this.linkState === 'active') this.setState('unresponsive')
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
        this.packetsSent += 1
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

    // === receiving ===

    private handlePacket(packet: Packet): void {
        this.lastHeardAt = now()
        if (this.linkState === 'unresponsive') this.setState('active')

        if (packet.type === BoardPacket.PONG) {
            const sentAt = this.pingSentAt.get(packet.a)
            if (sentAt !== undefined) {
                this.rttMs = now() - sentAt
                this.pingSentAt.delete(packet.a)
            }
            this.onPong?.(packet)
            this.emit('stats', this.stats())
            return
        }

        if (packet.type === BoardPacket.STATUS) {
            this.watchdogTripped = Boolean(
                packet.b & StatusFlag.WATCHDOG_TRIPPED,
            )
            this.updateLoss(packet.a)
            this.emit('stats', this.stats())
        }
    }

    /** Compares how many packets the board counted against how many were sent, since the last STATUS. */
    private updateLoss(received: number): void {
        const current = { received, sent: this.packetsSent }
        const previous = this.lastStatus
        this.lastStatus = current
        if (!previous) return

        const sent = current.sent - previous.sent
        if (sent <= 0) return
        const counted = (current.received - previous.received) & 0xff
        this.lossPercent = Math.max(0, Math.round((1 - counted / sent) * 100))
    }
}

function clampSpeed(value: number): number {
    if (!Number.isFinite(value)) return 0
    return Math.max(-MAX_SPEED, Math.min(MAX_SPEED, Math.round(value)))
}

export const controllerLink = new ControllerLink()
