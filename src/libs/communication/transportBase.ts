/**
 * Behaviour every transport shares.
 *
 * USB, Web Bluetooth and the iOS plugin each carried their own copy of the
 * write fan-out, receive buffer, dispatch and error normalisation, and they
 * drifted. Most consequentially in how they reported errors, so a cancelled
 * Bluetooth picker restarted the board on one platform and did nothing on
 * another.
 *
 * Subclasses supply only how to open a link, push bytes, and tear down.
 */

import type { Communication, PicoMessage } from 'src/types/communication'
import type { BleDevice } from '@capacitor-community/bluetooth-le'
import type { Pico } from './communicate'
import {
    FrameReader,
    Kind,
    SEQUENCE_MODULO,
    SOH,
    encodeFrame,
    type Frame,
} from './frames'
import { MESSAGE_TYPES } from './protocol'

const SOH_CHAR = String.fromCharCode(SOH)

/** Cap on a partial line held while waiting for its newline. */
const MAX_LINE_LENGTH = 8192

/** Normalises anything throwable into a message safe to show a user. */
export function errorMessage(
    error: unknown,
    fallback = 'Unknown error',
): string {
    if (error instanceof Error) return error.message
    if (typeof error === 'string' && error) return error
    return String(error || fallback)
}

function isPicoMessage(value: unknown): value is PicoMessage {
    if (!value || typeof value !== 'object') return false
    if (!('type' in value) || !('message' in value)) return false

    const { type, message } = value as Record<string, unknown>
    return (
        typeof type === 'string' &&
        (MESSAGE_TYPES as readonly string[]).includes(type) &&
        typeof message !== 'undefined'
    )
}

export abstract class BaseTransport implements Communication {
    destroyed: boolean = false

    protected readonly decoder = new TextDecoder()
    protected readonly encoder = new TextEncoder()

    /** Partial trailing line, waiting for its newline. */
    private buffer: string = ''

    /** CONTINUE payloads accumulated for a device message still arriving. */
    private continuation: Uint8Array[] = []

    /** Frames or messages thrown away. Non-fatal, but worth counting. */
    private discardedCount: number = 0

    private readonly frames = new FrameReader()

    /** Set by the uploader while a framed upload is in flight. */
    private flowListener: ((frame: Frame) => void) | null = null

    /**
     * Outbound sequence for this connection.
     *
     * One counter for everything we send, so an upload and the commands around
     * it form a single ordered stream. The board resynchronises on BEGIN and
     * COMMAND, so a reconnect starting over at zero is fine.
     */
    private outSeq: number = 0

    constructor(protected parent: Pico) {}

    /** The connection this transport belongs to, for the uploader's listeners. */
    get parentPico(): Pico {
        return this.parent
    }

    // === platform hooks ===

    /**
     * Push bytes as-is. Implementations handle their own chunking.
     *
     * Frames go through here unmodified: they are length-prefixed, so anything
     * that reflows or re-terminates them breaks the framing.
     */
    protected abstract sendRaw(data: Uint8Array): Promise<void>

    abstract request(): Promise<void>
    abstract connect(
        port: SerialPort | BluetoothDevice | BleDevice,
    ): Promise<void>
    abstract disconnect(): Promise<void>
    abstract read(): void

    /** Most transports have nothing to set up ahead of a connection. */
    initialize(): void {}

    // === sending ===

    /** The sequence the next frame would use, without consuming it. */
    peekSequence(): number {
        return this.outSeq
    }

    /** Reserve sequence numbers for the next `count` frames. */
    takeSequence(count: number): number {
        const start = this.outSeq
        this.outSeq = (this.outSeq + count) % SEQUENCE_MODULO
        return start
    }

    /** Send a control command by name, inside a COMMAND frame. */
    async write(command: string | string[]): Promise<void> {
        const queue = Array.isArray(command) ? command : [command]

        try {
            for (const name of queue) {
                if (this.destroyed) break
                await this.sendRaw(
                    encodeFrame(this.takeSequence(1), Kind.COMMAND, name),
                )
            }
        } catch (error) {
            this.reportError(errorMessage(error, 'Could not write to Ro/Box!'))
            throw new Error('Could not write to Ro/Box!', { cause: error })
        }
    }

    /** Send pre-encoded frames, in order. */
    async writeFrames(frames: Uint8Array[]): Promise<void> {
        for (const frame of frames) {
            if (this.destroyed) return
            await this.sendRaw(frame)
        }
    }

    setFlowListener(listener: ((frame: Frame) => void) | null): void {
        this.flowListener = listener
    }

    /**
     * Pacing feedback from the uploader.
     *
     * Only BLE paces itself, so these are no-ops elsewhere: USB is a reliable
     * stream with its own flow control and nothing to tune.
     */
    notePacingClean(): void {}
    notePacingLoss(): void {}

    /** Pacing state for reporting, when the transport has any. */
    pacingStats(): Record<string, number> | null {
        return null
    }

    // === receiving ===

    /**
     * Route received text. Every receive path ends here.
     *
     * Everything the board sends is framed, so a complete line that does not
     * begin with SOH is noise: counted rather than guessed at.
     */
    protected ingest(chunk: string): void {
        if (this.destroyed) return
        if (!chunk) return

        this.buffer += chunk

        const lines = this.buffer.split('\n')
        this.buffer = lines.pop() ?? ''

        // A line that never terminates would otherwise grow without bound.
        if (this.buffer.length > MAX_LINE_LENGTH) {
            this.discardedCount += this.buffer.length
            this.buffer = ''
        }

        for (const line of lines) {
            if (line.startsWith(SOH_CHAR)) {
                this.ingestFrameLine(line)
            } else if (line.trim()) {
                this.discardedCount += line.length
            }
        }
    }

    /** Decode raw bytes from the link, then hand them to `ingest`. */
    protected ingestBytes(data: ArrayBufferView | ArrayBuffer): void {
        this.ingest(this.decoder.decode(data))
    }

    private ingestFrameLine(line: string): void {
        const { frames, damage } = this.frames.feed(
            this.encoder.encode(line + '\n'),
        )
        this.discardedCount += damage

        // A lost frame means the pieces either side of it no longer belong
        // together, so a half-built message must not be completed with them.
        if (damage) this.continuation = []

        for (const frame of frames) {
            if (frame.kind === Kind.CONTINUE) {
                this.continuation.push(frame.payload)
                continue
            }

            if (frame.kind === Kind.REPLY) {
                this.dispatchReply([...this.continuation, frame.payload])
                this.continuation = []
                continue
            }

            this.flowListener?.(frame)
        }
    }

    /** Reassemble a device message and hand it to the connection. */
    private dispatchReply(parts: Uint8Array[]): void {
        const total = parts.reduce((sum, part) => sum + part.length, 0)
        const joined = new Uint8Array(total)
        let offset = 0
        for (const part of parts) {
            joined.set(part, offset)
            offset += part.length
        }

        try {
            const parsed: unknown = JSON.parse(this.decoder.decode(joined))
            if (isPicoMessage(parsed)) {
                this.parent.handleMessage(parsed)
                return
            }
        } catch {
            // The frame passed its checksum but its payload is not a message.
        }
        this.discardedCount += total
    }

    /**
     * Report a host-side failure: cancelled picker, failed write, dropped link.
     *
     * Distinct from `handleMessage({type: 'error'})`, which means the board
     * reported an error and therefore restarts it. Conflating the two is why a
     * failed `requestDevice` used to send RESTART over Web Bluetooth.
     */
    protected reportError(message: string): void {
        this.parent.emit('error', { message })
    }

    /** Number of malformed or unrecognised payloads discarded so far. */
    get discarded(): number {
        return this.discardedCount
    }

    protected resetBuffer(): void {
        this.buffer = ''
        this.continuation = []
    }

    async destroy(): Promise<void> {
        this.destroyed = true
        try {
            await this.disconnect()
        } catch {
            // Tearing down a link that is already gone is not an error.
        }
        this.resetBuffer()
    }
}

/** Pause between chunked writes, so the peer's receive buffer can drain. */
export function delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds))
}
