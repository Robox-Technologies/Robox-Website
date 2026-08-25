/**
 * Behaviour every transport shares.
 *
 * USB, Web Bluetooth and the iOS plugin each carried their own copy of the
 * write fan-out, receive buffer, dispatch and error normalisation, and they
 * drifted. Most consequentially in how they reported errors, so a cancelled
 * Bluetooth picker restarted the board on one platform and did nothing on
 * another.
 *
 * Subclasses supply only how to open a link, push one message, and tear down.
 */

import type { Communication, PicoMessage } from 'src/types/communication'
import type { BleDevice } from '@capacitor-community/bluetooth-le'
import type { Pico } from './communicate'
import { errorMessage, parseBufferedMessages } from './framing'
import { FrameReader, Kind, SOH, frameText, type Frame } from './frames'

const SOH_CHAR = String.fromCharCode(SOH)

/** Cap on a partial line held while waiting for its newline. */
const MAX_LINE_LENGTH = 8192

export abstract class BaseTransport implements Communication {
    destroyed: boolean = false

    protected readonly decoder = new TextDecoder()
    protected readonly encoder = new TextEncoder()

    /** Partial trailing line, waiting for its newline. */
    private buffer: string = ''

    /** Non-frame text, for the legacy JSON framer. */
    private legacyBuffer: string = ''

    /** Messages the framer threw away. Non-fatal, but worth counting. */
    private discardedCount: number = 0

    private readonly frames = new FrameReader()

    /** Set by the uploader while a framed upload is in flight. */
    private flowListener: ((frame: Frame) => void) | null = null

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
    abstract connect(port: SerialPort | BluetoothDevice | BleDevice): Promise<void>
    abstract disconnect(): Promise<void>
    abstract read(): void

    /** Most transports have nothing to set up ahead of a connection. */
    initialize(): void {}

    // === shared behaviour ===

    async write(messages: string | string[]): Promise<void> {
        const queue = Array.isArray(messages) ? messages : [messages]

        try {
            for (const message of queue) {
                if (this.destroyed) break
                await this.sendRaw(this.encoder.encode(message + '\n'))
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
     * Route received text. Every receive path ends here.
     *
     * Both protocols are line-oriented and a frame always starts with SOH,
     * which legacy text cannot contain, so the first character of a complete
     * line decides where it goes. The board routes on the same rule.
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
                this.legacyBuffer += line + '\n'
            }
        }

        if (this.legacyBuffer) {
            const { messages, remainder, discarded } = parseBufferedMessages(
                this.legacyBuffer,
            )
            this.legacyBuffer = remainder
            this.discardedCount += discarded

            for (const message of messages) {
                this.parent.handleMessage(message)
            }
        }
    }

    private ingestFrameLine(line: string): void {
        const { frames, damage } = this.frames.feed(
            this.encoder.encode(line + '\n'),
        )
        this.discardedCount += damage

        for (const frame of frames) {
            if (frame.kind === Kind.REPLY) {
                // A device message wrapped in a frame; unwrap and dispatch it
                // through the same path as legacy JSON.
                const { messages } = parseBufferedMessages(frameText(frame))
                for (const message of messages) {
                    this.parent.handleMessage(message)
                }
                continue
            }
            this.flowListener?.(frame)
        }
    }

    /** Decode raw bytes from the link, then hand them to `ingest`. */
    protected ingestBytes(data: ArrayBufferView | ArrayBuffer): void {
        this.ingest(this.decoder.decode(data))
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

    /** Forward a synthetic message as though the board had sent it. */
    protected dispatch(message: PicoMessage): void {
        this.parent.handleMessage(message)
    }

    /** Number of malformed or unrecognised payloads discarded so far. */
    get discarded(): number {
        return this.discardedCount
    }

    protected resetBuffer(): void {
        this.buffer = ''
        this.legacyBuffer = ''
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
