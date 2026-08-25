/**
 * What the two Bluetooth transports have in common.
 *
 * Web Bluetooth and the Capacitor plugin differ only in the calls used to
 * discover, connect, write and subscribe. The MTU chunking, the pacing, the
 * newline termination and the device-picker error handling are identical, so
 * they live here.
 */

import { BLE_CHUNK_SIZE, BLE_WRITE_DELAY_MS } from './protocol'
import { BaseTransport, delay, errorMessage } from './transportBase'

export const NOT_FOUND_MESSAGE =
    'Could not request Ro/Box! Make sure you have it powered on and nearby.'

export abstract class BleTransport extends BaseTransport {
    /** Push one MTU-sized chunk over the link. */
    protected abstract writeChunk(chunk: Uint8Array<ArrayBuffer>): Promise<void>

    /**
     * Chunk by bytes, never by string index.
     *
     * Slicing a string then encoding, as the Web Bluetooth implementation used
     * to, overflows the MTU on any multi-byte character, since one UTF-16 unit
     * can encode to four bytes. Working on bytes makes the bound exact.
     */
    protected async sendRaw(payload: Uint8Array): Promise<void> {
        for (
            let offset = 0;
            offset < payload.length;
            offset += BLE_CHUNK_SIZE
        ) {
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
     * Shared handling for the device picker. Dismissing it throws
     * `NotFoundError`, which is not worth surfacing: revert the connecting
     * state and rethrow so the caller can stay quiet.
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
