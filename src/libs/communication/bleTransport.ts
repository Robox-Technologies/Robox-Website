/** What the two Bluetooth transports share: MTU chunking, pacing, termination, picker errors. */

import { AdaptivePacer, BLE_CHUNK_SIZE } from './frames'
import { BaseTransport, delay, errorMessage } from './transportBase'

export const NOT_FOUND_MESSAGE =
    'Could not request Ro/Box! Make sure you have it powered on and nearby.'

export abstract class BleTransport extends BaseTransport {
    /** Inter-chunk pacing, on the transport so it survives into the next upload. */
    readonly pacer = new AdaptivePacer()

    /** Push one MTU-sized chunk over the link. */
    protected abstract writeChunk(chunk: Uint8Array<ArrayBuffer>): Promise<void>

    /** Chunks by bytes, never string index — slicing then encoding overflows the MTU. */
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
            // Read fresh each time, so a mid-upload backoff takes effect on
            // the very next chunk rather than the next upload.
            await delay(this.pacer.takeDelayMs())
        }
    }

    notePacingClean(): void {
        this.pacer.onCleanBatch()
    }

    notePacingLoss(): void {
        this.pacer.onLoss()
    }

    pacingStats(): Record<string, number | null> {
        return { ...this.pacer.stats() }
    }

    /** Device picker errors. Dismissing it throws `NotFoundError`, which isn't worth surfacing. */
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
