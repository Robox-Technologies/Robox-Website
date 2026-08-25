/**
 * What the two Bluetooth transports have in common.
 *
 * Web Bluetooth and the Capacitor plugin differ only in the calls used to
 * discover, connect, write and subscribe. The MTU chunking, the pacing, the
 * newline termination and the device-picker error handling are identical, so
 * they live here.
 */

import { BLE_CHUNK_SIZE, BLE_WRITE_DELAY_MS } from './protocol'
import { BaseTransport, delay } from './transportBase'
import { errorMessage } from './framing'

export const NOT_FOUND_MESSAGE =
    'Could not request Ro/Box! Make sure you have it powered on and nearby.'

export abstract class BleTransport extends BaseTransport {
    /** Push one MTU-sized chunk over the link. */
    protected abstract writeChunk(chunk: Uint8Array<ArrayBuffer>): Promise<void>

    /**
     * Chunk by *encoded bytes*, not by string index.
     *
     * Slicing the string first and encoding after -- which the Web Bluetooth
     * implementation used to do -- produces chunks larger than the MTU as soon
     * as the payload contains a multi-byte character, because one UTF-16 unit
     * can encode to up to four bytes. Encoding first makes the bound exact and
     * stops a comment with an accent in it from silently overflowing a write.
     */
    protected async sendMessage(message: string): Promise<void> {
        const payload = this.encoder.encode(message + '\n')

        for (let offset = 0; offset < payload.length; offset += BLE_CHUNK_SIZE) {
            if (this.destroyed) return
            // Copied rather than a subarray view: the Web Bluetooth typings
            // require an ArrayBuffer-backed view, not ArrayBufferLike.
            await this.writeChunk(
                new Uint8Array(
                    payload.subarray(offset, offset + BLE_CHUNK_SIZE),
                ),
            )
            await delay(BLE_WRITE_DELAY_MS)
        }
    }

    /**
     * Shared handling for the device picker.
     *
     * A user dismissing the picker throws `NotFoundError`, which is not a
     * failure worth showing them -- it just reverts the connecting state and
     * propagates so the caller can stay quiet about it.
     */
    protected handleRequestFailure(error: unknown): never | void {
        const isDismissal =
            (error instanceof DOMException || error instanceof Error) &&
            error.name === 'NotFoundError'

        if (isDismissal) {
            this.parent.revertConnectionState()
            throw error
        }

        this.reportError(errorMessage(error, 'Failed to connect to Ro/Box'))
    }
}
