import type { Communication, PicoMessage }  from "src/types/communication";
import type { Pico } from "./communicate";

const WRITE_TIMEOUT = 2
const UART_SERVICE = 0xFFE0
const UART_CHARACTERISTIC = 0xFFE1
const CHUNK_SIZE = 20

export class BluetoothCommunication implements Communication {
    destroyed: boolean = false
    private device: BluetoothDevice | null = null
    private server: BluetoothRemoteGATTServer | null = null
    private characteristic: BluetoothRemoteGATTCharacteristic | null = null
    private decoder: TextDecoder
    private encoder: TextEncoder
    private buffer: string = ""
    private readonly valueChangedBound = this.valueChanged.bind(this)
    private readonly initPortsBound = this.initPorts.bind(this)

    constructor(private parent: Pico) {
        this.decoder = new TextDecoder()
        this.encoder = new TextEncoder()
    }

    async request(): Promise<void> {
        try {
            const device = await navigator.bluetooth.requestDevice({
                filters: [{ namePrefix: 'RoBox' }],
                optionalServices: [UART_SERVICE],
            })

            if (!device) {
                this.parent.handleMessage({
                    type: 'error',
                    message: 'Could not request Ro/Box! Make sure you have it powered on and nearby.'
                })
                return
            }

            await this.parent.connect(device)
        } catch (error) {
            if (error instanceof DOMException && error.name === 'NotFoundError') {
                this.parent.emit('revert', {})
            } else {
                const message = error instanceof Error ? error.message : String(error)
                this.parent.handleMessage({ type: 'error', message })
            }
        }
    }

    async connect(device: BluetoothDevice): Promise<void> {
        this.device = device
        this.server = await device.gatt?.connect() || null
        const service = await this.server?.getPrimaryService(UART_SERVICE) || null
        this.characteristic = await service?.getCharacteristic(UART_CHARACTERISTIC) || null
        await this.characteristic?.startNotifications()

        if (!this.server || !this.characteristic) {
            throw new Error('Could not connect to Ro/Box! Try resetting it?')
        }

        this.device.addEventListener('gattserverdisconnected', this.initPortsBound)
        this.read()
    }

    private valueChanged(event: Event): void {
        if (this.destroyed) return
        if (event.type !== "characteristicvaluechanged") return

        const target = event.target
        if (!target || !("value" in target) || typeof target.value === "undefined") return

        const rawValue = target.value
        if (!rawValue || !(rawValue instanceof DataView)) return

        const value = this.decoder.decode(rawValue)
        if (typeof value !== "string") return

        this.buffer += value

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
                break
            }
        }

        this.buffer = this.buffer.slice(lastIndex)

        for (const message of consoleMessages) {
            this.parent.handleMessage(message)
        }
    }

    read(): void {
        this.characteristic?.addEventListener('characteristicvaluechanged', this.valueChangedBound)
    }

    private async chunkedWrite(message: string): Promise<void> {
        message += '\n'
        for (let i = 0; i < message.length; i += CHUNK_SIZE) {
            const chunk = message.slice(i, i + CHUNK_SIZE)
            const data = this.encoder.encode(chunk)
            await this.characteristic?.writeValue(data)
            await new Promise(resolve => setTimeout(resolve, WRITE_TIMEOUT))
        }
    }

    async write(messages: string | string[]): Promise<void> {
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
            const message = error instanceof Error ? error.message : String(error)
            this.parent.handleMessage({ type: 'error', message })
            throw new Error("Could not write to Ro/Box!")
        }
    }

    initialize(): void {
        return
    }

    private initPorts(event: Event): void {
        if (!event.target) return

        const device = event.target as BluetoothDevice
        if (device.name && device.name.startsWith("RoBox")) {
            if (event.type === 'gattserverdisconnected') {
                this.parent.disconnect()
            }
        }
    }

    async disconnect(): Promise<void> {
        try {
            this.device?.removeEventListener('gattserverdisconnected', this.initPortsBound)

            if (this.server && this.server.connected && this.characteristic) {
                await this.characteristic.stopNotifications()
                this.characteristic.removeEventListener('characteristicvaluechanged', this.valueChangedBound)
            }

            if (this.server && this.server.connected) {
                this.server.disconnect()
            }

            this.device = null
            this.server = null
            this.characteristic = null
        } catch (error) {
            throw new Error(
                error instanceof Error
                    ? error.message
                    : String(error || "Could not disconnect from Ro/Box!")
            )
        }
    }

    async destroy(): Promise<void> {
        this.device?.removeEventListener('gattserverdisconnected', this.initPortsBound)
        await this.disconnect()
        this.destroyed = true
    }
}