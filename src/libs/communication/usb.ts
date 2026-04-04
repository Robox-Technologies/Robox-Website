import type { Communication, PicoMessage } from 'src/types/communication'
import type { Pico } from './communicate'

const PI_VENDOR_ID = 0x2e8a

export class USBCommunication implements Communication {
    destroyed: boolean = false
    private baudRate: number
    private port: SerialPort | null = null
    private textEncoder: TextEncoderStream | null = null
    private currentWriter: WritableStreamDefaultWriter | null = null
    private textDecoder: TextDecoderStream | null = null
    private currentReader: ReadableStreamDefaultReader | null = null
    private currentWriterStreamClosed: Promise<void> = Promise.resolve()
    private currentReadableStreamClosed: Promise<void> = Promise.resolve()
    private readonly initPortsBound = this.initPorts.bind(this)

    constructor(
        private parent: Pico,
        baudRate = 9600,
    ) {
        this.baudRate = baudRate
    }

    read(): void {
        if (!this.currentReader) return

        let errorString = ''

        const readLoop = async () => {
            try {
                while (!this.destroyed && this.currentReader) {
                    const { value, done } = await this.currentReader.read()

                    if (done) {
                        this.currentReader.releaseLock()
                        break
                    }

                    let consoleMessages: PicoMessage[] = []

                    try {
                        if (typeof value !== 'string') continue
                        consoleMessages = [JSON.parse(value)]
                        errorString = ''
                    } catch {
                        errorString += value
                        const rawErrorMessages = errorString.split('\n')
                        let index = 0

                        for (const errorMessage of rawErrorMessages) {
                            try {
                                if (typeof errorMessage !== 'string') {
                                    throw new Error(
                                        'Received non-string message from the Ro/Box!',
                                    )
                                }
                                consoleMessages.push(JSON.parse(errorMessage))
                                index += 1
                            } catch {
                                break
                            }
                        }

                        rawErrorMessages.splice(0, index)
                        errorString = rawErrorMessages.join('\n').trim()
                    }

                    for (const message of consoleMessages) {
                        this.parent.handleMessage(message)
                    }
                }
            } catch (err) {
                console.warn('USB read error:', err)
            }
        }

        readLoop()
    }

    async write(messages: string | string[]): Promise<void> {
        if (!this.currentWriter || this.destroyed) {
            throw new Error('Could not write to Ro/Box!')
        }

        try {
            if (Array.isArray(messages)) {
                for (const message of messages) {
                    if (this.destroyed) break
                    await this.currentWriter.write(`${message}\n`)
                }
            } else {
                await this.currentWriter.write(`${messages}\n`)
            }
        } catch (error) {
            throw new Error('Could not write to Ro/Box!')
        }
    }

    async connect(port: SerialPort): Promise<void> {
        this.port = port

        if (this.port?.readable?.locked || this.port?.writable?.locked) {
            throw new Error('Port already in use')
        }

        try {
            await this.port.open({ baudRate: this.baudRate })
        } catch (error) {
            throw new Error(
                'We are unable to open the port on the Ro/Box! Try resetting it? This could also be caused by another application using the Ro/Box.',
            )
        }

        if (!this.port.writable || !this.port.readable) {
            throw new Error('The port is not readable/writable!')
        }

        this.textEncoder = new TextEncoderStream()
        this.textDecoder = new TextDecoderStream()

        this.currentWriterStreamClosed = this.textEncoder.readable.pipeTo(
            this.port.writable,
        )
        this.currentReadableStreamClosed = this.port.readable.pipeTo(
            //@ts-expect-error There is a type mismatch in the Streams API typings that causes this to error, but it works correctly at runtime
            // as seen here https://github.com/microsoft/typescript/issues/62168
            this.textDecoder.writable as WritableStream<BufferSource>,
        )

        this.currentWriter = this.textEncoder.writable.getWriter()
        this.currentReader = this.textDecoder.readable.getReader()

        this.read()
    }

    async disconnect(): Promise<void> {
        try {
            if (this.currentReader) {
                try {
                    await this.currentReader.cancel()
                    this.currentReader.releaseLock()
                    await this.currentReadableStreamClosed?.catch(() => {})
                } catch (error) {
                    console.warn('Error closing reader:', error)
                }
            }

            if (this.currentWriter) {
                try {
                    await this.currentWriter.close()
                    this.currentWriter.releaseLock()
                    await this.currentWriterStreamClosed?.catch(() => {})
                } catch (error) {
                    console.warn('Error closing writer:', error)
                }
            }

            if (this.port) {
                try {
                    await this.port.close()
                } catch (error) {
                    throw new Error('Could not close the port!')
                }
            }

            this.textEncoder = new TextEncoderStream()
            this.textDecoder = new TextDecoderStream()
        } catch (error) {
            throw new Error(
                error instanceof Error
                    ? error.message
                    : String(error || 'Could not disconnect from Ro/Box!'),
            )
        }
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
                this.parent.emit('revert', {})
                throw error
            } else {
                this.parent.handleMessage({
                    type: 'error',
                    message:
                        'Could not request Ro/Box! Make sure you have it connected via USB.',
                })
            }
        }
    }

    private async initPorts(event: Event): Promise<void> {
        if (!event.target || !('getInfo' in event.target)) return

        const port = event.target as SerialPort
        const portInfo = port.getInfo()

        if (portInfo.usbVendorId === PI_VENDOR_ID) {
            if (event.type === 'connect') {
                await this.parent.connect(port)
            } else if (
                event.type === 'disconnect' &&
                !this.parent.getState().isRestarting
            ) {
                await this.parent.disconnect()
            }
        }
    }

    initialize(): void {
        if (!navigator.serial) return

        navigator.serial.addEventListener('connect', this.initPortsBound)
        navigator.serial.addEventListener('disconnect', this.initPortsBound)
    }

    async destroy(): Promise<void> {
        if (navigator.serial) {
            navigator.serial.removeEventListener('connect', this.initPortsBound)
            navigator.serial.removeEventListener(
                'disconnect',
                this.initPortsBound,
            )
        }

        await this.disconnect()
        this.destroyed = true
        this.port = null
        this.currentReader = null
        this.currentWriter = null
    }
}
