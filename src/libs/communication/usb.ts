/**
 * Web Serial transport. USB CDC retransmits on its own, but the shared framer is still
 * needed: a `TextDecoderStream` splits wherever chunks fall, so a message can straddle reads.
 */

import { BaseTransport, errorMessage } from './transportBase'
import { ConnectionStatus } from 'src/types/communication'

const PI_VENDOR_ID = 0x2e8a

export class USBCommunication extends BaseTransport {
    private port: SerialPort | null = null
    private textEncoder: TextEncoderStream | null = null
    private textDecoder: TextDecoderStream | null = null
    private currentWriter: WritableStreamDefaultWriter | null = null
    private currentReader: ReadableStreamDefaultReader | null = null
    private writerStreamClosed: Promise<void> = Promise.resolve()
    private readableStreamClosed: Promise<void> = Promise.resolve()

    private readonly initPortsBound = this.initPorts.bind(this)

    /**
     * On by default, so a reload reconnects to a plugged-in Ro/Box. Flashing turns it
     * off. Only governs reconnecting — noticing a disconnect is never gated by it.
     */
    private autoConnectEnabled = true

    setAutoConnect(enabled: boolean = true): void {
        this.autoConnectEnabled = enabled
    }

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
            await this.port.open({ baudRate: 9600 })
        } catch {
            throw new Error(
                'We are unable to open the port on the Ro/Box! Try resetting it? This could also be caused by another application using the Ro/Box.',
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

    private async initPorts(event: Event): Promise<void> {
        if (!event.target || !('getInfo' in event.target)) return

        const port = event.target as SerialPort
        if (port.getInfo().usbVendorId !== PI_VENDOR_ID) return

        // One plug-in fires several 'connect' events as the board re-enumerates, so this
        // leans on `Pico`'s connectionStatus — `port.readable`/`writable` stay null until
        // `port.open()` resolves. RESTARTING stays allowed, since a restart bounces the same way.
        if (event.type === 'connect') {
            // Only reconnecting is opt-in; the disconnect branch below always runs, or a
            // board that vanishes leaves `parent` reporting CONNECTED to a dead port.
            if (!this.autoConnectEnabled) return

            const { connectionStatus } = this.parent.getState()
            if (
                connectionStatus !== ConnectionStatus.DISCONNECTED &&
                connectionStatus !== ConnectionStatus.RESTARTING
            ) {
                return
            }
            await this.parent.connect(port)
        } else if (
            event.type === 'disconnect' &&
            !this.parent.getState().isRestarting
        ) {
            await this.parent.disconnect()
        }
    }

    initialize(): void {
        if (!navigator.serial) return
        navigator.serial.addEventListener('connect', this.initPortsBound)
        navigator.serial.addEventListener('disconnect', this.initPortsBound)

        // 'connect' only fires for ports appearing after the listener attaches, so scan
        // for one that was already plugged in.
        void this.connectExistingPort()
    }

    private async connectExistingPort(): Promise<void> {
        const ports = await navigator.serial.getPorts()
        if (!this.autoConnectEnabled) return

        for (const port of ports) {
            if (port.getInfo().usbVendorId === PI_VENDOR_ID) {
                await this.parent.connect(port)
                break
            }
        }
    }

    async destroy(): Promise<void> {
        if (navigator.serial) {
            navigator.serial.removeEventListener('connect', this.initPortsBound)
            navigator.serial.removeEventListener(
                'disconnect',
                this.initPortsBound,
            )
        }

        await super.destroy()
        this.port = null
    }
}
