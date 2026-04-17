import type { Communication, PicoMessage } from 'src/types/communication'
import type { Pico } from './communicate'
import {
    BleClient,
    numbersToDataView,
    numberToUUID,
    type BleDevice,
} from '@capacitor-community/bluetooth-le'

const WRITE_TIMEOUT = 30 // ms
const UART_SERVICE = 0xffe0
const UART_CHARACTERISTIC = 0xffe1
const CHUNK_SIZE = 20

export class IOSBluetoothCommunication implements Communication {
    destroyed: boolean = false
    private deviceId: string | null = null
    private buffer: string = ''
    private decoder: TextDecoder
    private encoder: TextEncoder
    private readonly notificationCallbackBound: (value: DataView) => void
    private readonly onDisconnectBound: (deviceId: string) => void

    constructor(private parent: Pico) {
        this.decoder = new TextDecoder()
        this.encoder = new TextEncoder()
        this.notificationCallbackBound = this.handleNotification.bind(this)
        this.onDisconnectBound = this.handleDisconnect.bind(this)
    }

    // Shows the native device picker on iOS (via the plugin) and calls parent.connect with the selected device.
    async request(): Promise<void> {
        try {
            await BleClient.initialize()
            const device = await BleClient.requestDevice({
                services: [numberToUUID(UART_SERVICE)],
                displayMode: 'list',
            })
            if (!device) {
                this.parent.emit('error', {
                    message:
                        'Could not request Ro/Box! Make sure you have it powered on and nearby.',
                })
                return
            }
            await this.parent.connect(device)
        } catch (error) {
            if (error instanceof Error && error.name === 'NotFoundError') {
                this.parent.emit('revert', {})
                throw error
            } else {
                const message =
                    error instanceof Error
                        ? error.message
                        : 'Failed to connect to Ro/Box'
                this.parent.emit('error', { message })
            }
        }
    }

    // Accepts either the BleDevice object (from requestDevice) or a saved deviceId (string).
    async connect(device: BleDevice): Promise<void> {
        const { deviceId } = device
        try {
            this.deviceId = deviceId

            // Connect and register an onDisconnect callback
            await BleClient.connect(deviceId, this.onDisconnectBound)

            // Start notifications on our UART characteristic
            this.read()
            return
        } catch (error) {
            this.deviceId = null
            this.buffer = ''
            throw new Error(
                error instanceof Error
                    ? error.message
                    : String(error || 'Could not connect to Ro/Box'),
            )
        }
    }
    read(): void {
        if (!this.deviceId) return

        BleClient.startNotifications(
            this.deviceId,
            numberToUUID(UART_SERVICE),
            numberToUUID(UART_CHARACTERISTIC),
            this.notificationCallbackBound,
        )
        return
    }
    private handleNotification(value: DataView): void {
        if (this.destroyed) return

        // DataView -> Uint8Array -> string
        const bytes = new Uint8Array(
            value.buffer,
            value.byteOffset,
            value.byteLength,
        )
        const chunk = this.decoder.decode(bytes)

        this.buffer += chunk

        const consoleMessages: PicoMessage[] = []
        const jsonRegex = /\{[^}]*\}/g
        let match: RegExpExecArray | null
        let lastIndex = 0

        while ((match = jsonRegex.exec(this.buffer)) !== null) {
            try {
                const jsonString = match[0]
                const message: PicoMessage = JSON.parse(jsonString)
                consoleMessages.push(message)
                lastIndex = jsonRegex.lastIndex
            } catch {
                break // malformed JSON, wait for more data
            }
        }

        this.buffer = this.buffer.slice(lastIndex)

        for (const message of consoleMessages) {
            this.parent.handleMessage(message)
        }
    }

    private handleDisconnect(deviceId: string): void {
        // The plugin calls our onDisconnect callback when the device disconnects
        if (!this.deviceId) return
        if (deviceId === this.deviceId) {
            this.parent.disconnect()
        }
    }

    async write(messages: string | string[]): Promise<void> {
        if (!this.deviceId) throw new Error('Not connected')

        try {
            if (Array.isArray(messages)) {
                for (const message of messages) {
                    if (this.destroyed) break
                    await this.chunkedWrite(message)
                }
            } else {
                if (this.destroyed) return
                await this.chunkedWrite(messages)
            }
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error)
            this.parent.emit('error', { message })
            throw new Error('Could not write to Ro/Box!', {
                cause: error,
            })
        }
    }

    private async chunkedWrite(message: string): Promise<void> {
        // ensure newline termination like web implementation
        message += '\n'

        const bytes = this.encoder.encode(message)

        for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
            const slice = bytes.slice(i, i + CHUNK_SIZE)
            // convert to numbers array for numbersToDataView helper
            const nums = Array.from(slice)
            const dataView = numbersToDataView(nums)
            await BleClient.writeWithoutResponse(
                this.deviceId!,
                numberToUUID(UART_SERVICE),
                numberToUUID(UART_CHARACTERISTIC),
                dataView,
            )

            // small pause between chunks
            await new Promise((resolve) => setTimeout(resolve, WRITE_TIMEOUT))
        }
    }

    initialize(): void {
        // No-op: initialization is handled in request() via BleClient.initialize()
    }

    async disconnect(): Promise<void> {
        try {
            if (!this.deviceId) return


            await BleClient.disconnect(this.deviceId)

            this.deviceId = null
            this.buffer = ''
        } catch (error) {
            throw new Error(
                error instanceof Error
                    ? error.message
                    : String(error || 'Could not disconnect from Ro/Box'),
            )
        }
    }

    async destroy(): Promise<void> {
        try {
            this.destroyed = true
            if (this.deviceId) {
                try {
                    await this.disconnect()
                } catch {
                    /* ignore */
                }
            }
        } finally {
            this.destroyed = true
        }
    }
}
