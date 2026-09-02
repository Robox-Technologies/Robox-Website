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
import { COMMANDS, MESSAGE_TYPES } from './protocol'

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

    /** Only USB has an auto-connect behaviour to toggle. */
    setAutoConnect(): void {}

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

    /**
     * Every `sendRaw()` call - from `write()`, `writeFrames()`, and
     * `release()` - is chained onto this single promise, so two calls
     * issued back to back (e.g. four calibration commands fired from one
     * click handler) can never overlap on the wire. Web Bluetooth enforces
     * this itself and throws "GATT operation already in progress" the
     * moment a second `writeValue()` starts before the first resolves; USB
     * and iOS BLE don't complain, but interleaved frames would silently
     * corrupt the byte stream just the same.
     *
     * Chained with a `.then(ok, ok)` rather than the raw result, so a
     * failed call clears the way for the next one instead of leaving every
     * later call permanently stuck behind a rejected promise.
     */
    private sendQueue: Promise<void> = Promise.resolve()

    private enqueueSend<T>(task: () => Promise<T>): Promise<T> {
        const run = this.sendQueue.then(task)
        this.sendQueue = run.then(
            () => undefined,
            () => undefined,
        )
        return run
    }

    /** Send a control command by name, inside a COMMAND frame. */
    write(command: string | string[]): Promise<void> {
        return this.enqueueSend(async () => {
            const queue = Array.isArray(command) ? command : [command]

            try {
                for (const name of queue) {
                    if (this.destroyed) break
                    await this.sendRaw(
                        encodeFrame(this.takeSequence(1), Kind.COMMAND, name),
                    )
                }
            } catch (error) {
                this.reportError(
                    errorMessage(error, 'Could not write to Ro/Box!'),
                )
                throw new Error('Could not write to Ro/Box!', {
                    cause: error,
                })
            }
        })
    }

    /**
     * Hand the board back before the link goes away, so it stops claiming this
     * interface.
     *
     * Quiet, unlike `write`: a link that has already dropped is the ordinary
     * reason this fails, and reporting it would put a write error in front of
     * the user on every unexpected disconnect.
     */
    release(): Promise<void> {
        if (this.destroyed) return Promise.resolve()

        return this.enqueueSend(async () => {
            try {
                await this.sendRaw(
                    encodeFrame(
                        this.takeSequence(1),
                        Kind.COMMAND,
                        COMMANDS.DISCONNECT,
                    ),
                )
            } catch {
                // The link is already gone, so there is nothing to hand back.
            }
        })
    }

    /** Send pre-encoded frames, in order. */
    writeFrames(frames: Uint8Array[]): Promise<void> {
        return this.enqueueSend(async () => {
            for (const frame of frames) {
                if (this.destroyed) return
                await this.sendRaw(frame)
            }
        })
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
    pacingStats(): Record<string, number | null> | null {
        return null
    }

    // === receiving ===

    /**
     * Route received text. Every receive path ends here.
     *
     * Everything the board sends is framed, so anything outside a frame is
     * noise: counted rather than guessed at.
     */
    protected ingest(chunk: string): void {
        // console.log(chunk)
        if (this.destroyed) return
        if (!chunk) return

        this.buffer += chunk

        const lines = this.buffer.split('\n')
        this.buffer = lines.pop() ?? ''

        // Unterminated chatter would otherwise grow without bound. Keep
        // everything from the newest sentinel, where a frame can still start.
        if (this.buffer.length > MAX_LINE_LENGTH) {
            const start = this.buffer.lastIndexOf(SOH_CHAR)
            this.discardedCount += start === -1 ? this.buffer.length : start
            this.buffer = start > 0 ? this.buffer.slice(start) : ''
        }

        for (const line of lines) {
            // Taken from wherever the sentinel is, not only from the front:
            // the module's unterminated chatter arrives glued to the next
            // frame, and insisting otherwise discarded that frame with it.
            const start = line.indexOf(SOH_CHAR)
            if (start === -1) {
                if (line.trim()) this.discardedCount += line.length
                continue
            }

            this.discardedCount += start
            this.ingestFrameLine(line.slice(start))
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
