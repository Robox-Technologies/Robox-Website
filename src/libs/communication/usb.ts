/**
 * Web Serial transport. USB CDC retransmits on its own, but the shared framer is still
 * needed: a `TextDecoderStream` splits wherever chunks fall, so a message can straddle reads.
 */

import { BaseTransport, errorMessage } from './transportBase'
import { stageWrap, withTimeout } from './connectionDiagnostics'

const PI_VENDOR_ID = 0x2e8a

export class USBCommunication extends BaseTransport {
    private port: SerialPort | null = null
    private textEncoder: TextEncoderStream | null = null
    private textDecoder: TextDecoderStream | null = null
    private currentWriter: WritableStreamDefaultWriter | null = null
    private currentReader: ReadableStreamDefaultReader | null = null
    private writerStreamClosed: Promise<void> = Promise.resolve()
    private readableStreamClosed: Promise<void> = Promise.resolve()

    private readonly handleUnplugBound = this.handleUnplug.bind(this)

    read(): void {
        if (!this.currentReader) return

        const readLoop = async () => {
            try {
                while (!this.destroyed && this.currentReader) {
                    const { value, done } = await this.currentReader.read()

                    if (done) {
                        this.currentReader.releaseLock()
                        break
                    }

                    if (typeof value === 'string') {
                        this.ingest(value)
                    }
                }
            } catch (error) {
                console.warn('USB read error:', error)
            }
        }

        void readLoop()
    }

    protected async sendRaw(data: Uint8Array): Promise<void> {
        if (!this.currentWriter || this.destroyed) {
            throw new Error('Could not write to Ro/Box!')
        }

        // The port is behind a TextEncoderStream. Lossless here: our traffic is all valid UTF-8.
        await this.currentWriter.write(this.decoder.decode(data))
    }

    async connect(port: SerialPort): Promise<void> {
        this.port = port

        if (this.port.readable?.locked || this.port.writable?.locked) {
            throw new Error('Port already in use')
        }

        try {
            await stageWrap(
                'open',
                withTimeout(
                    this.port.open({ baudRate: 9600 }),
                    10000,
                    'USB connection timed out',
                ),
                'usb',
            )
        } catch {
            throw new Error(
                'We are unable to open the port on the Ro/Box! This could also be caused by another application using the USB port, like another webpage or app, please close these.',
            )
        }

        if (!this.port.writable || !this.port.readable) {
            throw new Error('The port is not readable/writable!')
        }

        this.textEncoder = new TextEncoderStream()
        this.textDecoder = new TextDecoderStream()

        this.writerStreamClosed = this.textEncoder.readable.pipeTo(
            this.port.writable,
        )
        this.readableStreamClosed = this.port.readable.pipeTo(
            //@ts-expect-error There is a type mismatch in the Streams API typings that causes this to error, but it works correctly at runtime
            // as seen here https://github.com/microsoft/typescript/issues/62168
            this.textDecoder.writable as WritableStream<BufferSource>,
        )

        this.currentWriter = this.textEncoder.writable.getWriter()
        this.currentReader = this.textDecoder.readable.getReader()

        this.read()
    }

    async request(): Promise<void> {
        try {
            const port = await navigator.serial.requestPort({
                filters: [{ usbVendorId: PI_VENDOR_ID }],
            })
            await this.parent.connect(port)
        } catch (error) {
            if (
                error instanceof DOMException &&
                error.name === 'NotFoundError'
            ) {
                this.parent.revertConnectionState()
                throw error
            }

            this.reportError(
                'Could not request Ro/Box! Make sure you have it connected via USB.',
            )
        }
    }

    async disconnect(): Promise<void> {
        try {
            if (this.currentReader) {
                try {
                    await this.currentReader.cancel()
                    this.currentReader.releaseLock()
                    await this.readableStreamClosed?.catch(() => {})
                } catch (error) {
                    console.warn('Error closing reader:', error)
                }
            }

            if (this.currentWriter) {
                try {
                    await this.currentWriter.close()
                    this.currentWriter.releaseLock()
                    await this.writerStreamClosed?.catch(() => {})
                } catch (error) {
                    console.warn('Error closing writer:', error)
                }
            }

            if (this.port) {
                try {
                    await this.port.close()
                } catch {
                    throw new Error('Could not close the port!')
                }
            }

            this.currentReader = null
            this.currentWriter = null
            this.textEncoder = null
            this.textDecoder = null
            this.resetBuffer()
        } catch (error) {
            throw new Error(
                errorMessage(error, 'Could not disconnect from Ro/Box!'),
            )
        }
    }

    // Connecting is always an explicit `request()`; this only notices a board
    // being unplugged, or `parent` would keep reporting CONNECTED to a dead port.
    private async handleUnplug(event: Event): Promise<void> {
        if (!event.target || !('getInfo' in event.target)) return

        const port = event.target as SerialPort
        if (port.getInfo().usbVendorId !== PI_VENDOR_ID) return
        // A restart can bounce the port; that isn't the student unplugging it.
        if (this.parent.getState().isRestarting) return
        await this.parent.disconnect()
    }

    initialize(): void {
        navigator.serial?.addEventListener('disconnect', this.handleUnplugBound)
    }

    async destroy(): Promise<void> {
        navigator.serial?.removeEventListener('disconnect', this.handleUnplugBound)

        await super.destroy()
        this.port = null
    }
}
