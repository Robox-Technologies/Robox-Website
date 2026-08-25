/**
 * The behaviour every transport shares.
 *
 * USB, Web Bluetooth and the iOS Bluetooth plugin previously carried their own
 * copies of the write fan-out, the receive buffer, the message dispatch and the
 * error normalisation. They drifted -- most consequentially in *how* they
 * reported errors, which meant a cancelled Bluetooth picker restarted the board
 * on one platform and did nothing on another. Keeping it in one place is what
 * stops that recurring.
 *
 * A subclass supplies only the platform-specific parts: how to open a link, how
 * to push one message, and how to tear down.
 */

import type { Communication, PicoMessage } from 'src/types/communication'
import type { BleDevice } from '@capacitor-community/bluetooth-le'
import type { Pico } from './communicate'
import { errorMessage, parseBufferedMessages } from './framing'

export abstract class BaseTransport implements Communication {
    destroyed: boolean = false

    protected readonly decoder = new TextDecoder()
    protected readonly encoder = new TextEncoder()

    /** Unconsumed tail of the receive stream. */
    private buffer: string = ''

    /** Messages the framer threw away. Non-fatal, but worth counting. */
    private discardedCount: number = 0

    constructor(protected parent: Pico) {}

    // -- platform hooks -----------------------------------------------------

    /** Push one logical message. Implementations handle their own chunking. */
    protected abstract sendMessage(message: string): Promise<void>

    abstract request(): Promise<void>
    abstract connect(port: SerialPort | BluetoothDevice | BleDevice): Promise<void>
    abstract disconnect(): Promise<void>
    abstract read(): void

    /** Most transports have nothing to set up ahead of a connection. */
    initialize(): void {}

    // -- shared behaviour ---------------------------------------------------

    async write(messages: string | string[]): Promise<void> {
        const queue = Array.isArray(messages) ? messages : [messages]

        try {
            for (const message of queue) {
                if (this.destroyed) break
                await this.sendMessage(message)
            }
        } catch (error) {
            this.reportError(errorMessage(error, 'Could not write to Ro/Box!'))
            throw new Error('Could not write to Ro/Box!', { cause: error })
        }
    }

    /**
     * Feed received text through the framer and dispatch whatever completes.
     * Every transport's receive path ends here.
     */
    protected ingest(chunk: string): void {
        if (this.destroyed) return
        if (!chunk) return

        this.buffer += chunk
        const { messages, remainder, discarded } = parseBufferedMessages(
            this.buffer,
        )
        this.buffer = remainder
        this.discardedCount += discarded

        for (const message of messages) {
            this.parent.handleMessage(message)
        }
    }

    /** Decode raw bytes from the link, then hand them to `ingest`. */
    protected ingestBytes(data: ArrayBufferView | ArrayBuffer): void {
        this.ingest(this.decoder.decode(data))
    }

    /**
     * Report a *host-side* failure: a cancelled picker, a write that never
     * left, a link that dropped.
     *
     * Deliberately distinct from `parent.handleMessage({type: 'error'})`, which
     * means "the board reported an error" and consequently restarts it.
     * Conflating the two is why a failed `requestDevice` used to send a RESTART
     * command over Web Bluetooth.
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
