/**
 * Web Serial transport.
 *
 * The reliable link: USB CDC does its own retransmission, so nothing arrives
 * corrupted. It still needs the shared framer, because a `TextDecoderStream`
 * splits its output wherever the chunk boundaries fall and a single message can
 * straddle two reads.
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
     * On by default, so a page reload with the Ro/Box already plugged in
     * reconnects on its own (e.g. the editor). Flows where that would be
     * unwanted - flashing must only ever connect from an explicit
     * `request()` click - turn it off. Only governs (re)connecting: noticing
     * an actual disconnect is never gated by this, since that just keeps
     * `parent`'s state honest and has nothing "automatic" about it.
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

        // The port is behind a TextEncoderStream, so bytes go out as text.
        // Lossless for our traffic: frames and legacy messages are both valid
        // UTF-8, so decode-then-encode reproduces them exactly.
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

        // The board re-enumerates itself several times during its own USB
        // boot handoff, so one physical plug-in can fire several 'connect'
        // (and sometimes 'disconnect') events. `Pico`'s connectionStatus is
        // the shared record of an attempt already in flight - a lock check on
        // the port itself can't see it, since `port.readable`/`writable` stay
        // null until `port.open()` resolves deep inside `connect()`. RESTARTING
        // has to stay allowed here too: a restart bounces the same way a
        // plug-in does, and the disconnect side already lets that bounce
        // through untouched, so the connect side has to complete it.
        if (event.type === 'connect') {
            // Only reconnecting is opt-in - noticing a disconnect below
            // always has to run regardless, or a board that vanishes while
            // this is off (e.g. rebooting into BOOTSEL during flashing)
            // leaves `parent` reporting CONNECTED to a port that is long
            // gone, with nothing left to clean it up until something else
            // tries to reuse the transport and hangs on a port the browser
            // never got told to let go of.
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

        // 'connect' only fires for ports that appear after the listener is
        // attached, so a board already plugged in when the page loads needs
        // this explicit scan to be picked up at all.
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
