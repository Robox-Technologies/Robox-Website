import type {
    Communication,
    PicoEventMap,
    CommunicationMethod,
    PicoState,
    PicoMessage,
} from 'src/types/communication'

import { ConnectionStatus, FirmwareStatus } from 'src/types/communication'
import { toast } from '@libs/ui/toast'

import { USBCommunication } from './usb'
import { BluetoothCommunication } from './webBle'
import { IOSBluetoothCommunication } from './iosBle'
import type { BleDevice } from '@capacitor-community/bluetooth-le'

const COMMANDS = {
    FIRMWARE_CHECK: 'x01FIRMCHECK\r',
    START_UPLOAD: 'x02BEGINUPLD\r',
    END_UPLOAD: 'x03ENDUPLD\r',
    START_PROGRAM: 'x04STARTPROG\r',
    CALIBRATE_COLOR: 'x05COLORCALIBRATE\r',
    RESTART: 'x06RESTART\r',
    BOOTLOADER: 'x07BOOTLOADER\r',
    KEYBOARD_INTERRUPT: '\x03\n',
} as const

type PicoEventListener<K extends keyof PicoEventMap> = (
    data: PicoEventMap[K],
) => void

type PicoEventHandler = (data: unknown) => void

const CURRENT_FIRMWARE_VERSION = '1.0.0'

const revertStateMapping: Partial<Record<ConnectionStatus, ConnectionStatus>> = {
    [ConnectionStatus.CONNECTING]: ConnectionStatus.DISCONNECTED,
    [ConnectionStatus.RESTARTING]: ConnectionStatus.CONNECTED,
    [ConnectionStatus.DISCONNECTING]: ConnectionStatus.DISCONNECTED,
}

export class Pico {
    private communication: Communication | null
    private state: PicoState
    private listeners: Map<keyof PicoEventMap, Set<PicoEventHandler>>
    private firmwareCheckTimeout: ReturnType<typeof setTimeout> | null = null
    private responded: boolean = false
    private firmwareConfirmed: boolean = false

    constructor() {
        this.communication = null
        this.listeners = new Map()
        this.state = {
            connectionStatus: ConnectionStatus.DISCONNECTED,
            firmwareStatus: FirmwareStatus.UNKNOWN,
            firmwareVersion: '0.0.0',
            isRestarting: false,
            communicationMethod: null,
        }
    }

    static parseBufferedMessages(buffer: string): {
        messages: PicoMessage[]
        remainder: string
    } {
        // Remove control characters that can corrupt JSON framing (e.g. null bytes from BLE payloads).
        const sanitized = buffer.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '')
        const messages: PicoMessage[] = []
        let cursor = 0
        let firstIncompleteStart = -1

        while (cursor < sanitized.length) {
            const start = sanitized.indexOf('{', cursor)
            if (start === -1) {
                break
            }

            const end = Pico.findJsonObjectEnd(sanitized, start)
            if (end === -1) {
                if (firstIncompleteStart === -1) {
                    firstIncompleteStart = start
                }
                // Keep scanning: a later '{' may begin a valid JSON object even if this one is malformed.
                cursor = start + 1
                continue
            }

            const candidate = sanitized.slice(start, end + 1)

            try {
                const parsed: unknown = JSON.parse(candidate)
                if (Pico.isPicoMessage(parsed)) {
                    messages.push(parsed)
                    cursor = end + 1
                    firstIncompleteStart = -1
                    continue
                }
            } catch {
                // Ignore malformed object and continue searching from the next '{'.
            }

            cursor = start + 1
        }

        const remainder =
            firstIncompleteStart === -1
                ? ''
                : sanitized.slice(firstIncompleteStart)

        return { messages, remainder }
    }

    private static findJsonObjectEnd(input: string, startIndex: number): number {
        let depth = 0
        let inString = false
        let escaped = false

        for (let i = startIndex; i < input.length; i += 1) {
            const char = input[i]

            if (inString) {
                if (escaped) {
                    escaped = false
                } else if (char === '\\') {
                    escaped = true
                } else if (char === '"') {
                    inString = false
                }
                continue
            }

            if (char === '"') {
                inString = true
                continue
            }

            if (char === '{') {
                depth += 1
            } else if (char === '}') {
                depth -= 1
                if (depth === 0) {
                    return i
                }
                if (depth < 0) {
                    return -1
                }
            }
        }

        return -1
    }

    private static isPicoMessage(value: unknown): value is PicoMessage {
        if (!value || typeof value !== 'object') return false
        if (!('type' in value) || !('message' in value)) return false

        const { type, message } = value as Record<string, unknown>

        const validTypes = ['console', 'download', 'error', 'firmware', 'connect']
        return typeof type === 'string' && validTypes.includes(type) && typeof message === 'string'
    }

    // Public getters for state
    getState(): PicoState {
        return { ...this.state }
    }

    parseBufferedMessages(buffer: string): {
        messages: PicoMessage[]
        remainder: string
    } {
        return Pico.parseBufferedMessages(buffer)
    }

    isConnected(): boolean {
        return this.state.connectionStatus === ConnectionStatus.CONNECTED
    }

    // Event listener management (for React hooks)
    on<K extends keyof PicoEventMap>(
        event: K,
        listener: PicoEventListener<K>,
    ): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set())
        }
        this.listeners.get(event)!.add(listener as PicoEventHandler)
    }

    off<K extends keyof PicoEventMap>(
        event: K,
        listener: PicoEventListener<K>,
    ): void {
        this.listeners.get(event)?.delete(listener as PicoEventHandler)
    }

    emit<K extends keyof PicoEventMap>(event: K, data: PicoEventMap[K]): void {
        // Emit toasts for error events only
        if (event === 'error') {
            const errorData = data as { message: string }
            toast.danger({
                title: 'Ro/Box Error',
                message: errorData.message,
                durationMs: 6000,
            })
        }
        this.listeners.get(event)?.forEach((listener) => listener(data))
    }

    revertConnectionState(): void {
        const revertedConnectionStatus =
            revertStateMapping[this.state.connectionStatus]

        if (!revertedConnectionStatus) return

        this.updateState({ connectionStatus: revertedConnectionStatus })
    }

    private updateState(updates: Partial<PicoState>): void {
        this.state = { ...this.state, ...updates }
        this.emit('stateChange', this.state)
    }

    async setCommunicationMethod(method: CommunicationMethod): Promise<void> {
        if (this.communication) {
            await this.communication.destroy()
        }

        this.responded = false
        this.firmwareConfirmed = false
        this.updateState({
            communicationMethod: method,
            connectionStatus: ConnectionStatus.DISCONNECTED,
            firmwareStatus: FirmwareStatus.UNKNOWN,
            isRestarting: false,
        })

        if (method === 'USB') {
            this.communication = new USBCommunication(this)
        } else if (method === 'WebBluetooth') {
            this.communication = new BluetoothCommunication(this)
        } else if (method === 'iOSBluetooth') {
            this.communication = new IOSBluetoothCommunication(this)
        }

        this.communication?.initialize()
    }

    async connect(
        port: SerialPort | BluetoothDevice | BleDevice,
    ): Promise<void> {
        if (!this.communication) {
            throw new Error('Communication method not set')
        }

        try {
            await this.communication.connect(port)
            
            toast.success({
                title: 'Ro/Box Connected',
                message: 'Your Ro/Box is connected and ready to run.',
                durationMs: 3000,
            })
            
            this.firmwareCheck()
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error)
            this.emit('error', { message })
        }
    }

    async disconnect(): Promise<void> {
        if (!this.communication) return

        try {
            this.responded = false
            this.firmwareConfirmed = false

            if (this.firmwareCheckTimeout) {
                clearTimeout(this.firmwareCheckTimeout)
                this.firmwareCheckTimeout = null
            }

            await this.communication.disconnect()
            this.updateState({
                connectionStatus: ConnectionStatus.DISCONNECTED,
                firmwareStatus: FirmwareStatus.UNKNOWN,
            })
        } catch (error) {
            const message =
                error instanceof Error ? error.message : String(error)
            this.emit('error', { message })
        }
    }

    handleMessage(payload: PicoMessage): void {
        const { type, message } = payload
        // First message means we're connected
        if (!this.responded) {
            this.responded = true
        }

        if (type === 'firmware') {
            this.firmwareConfirmed = true
            this.updateState({
                firmwareStatus: FirmwareStatus.UP_TO_DATE,
                connectionStatus: ConnectionStatus.CONNECTED,
                firmwareVersion: message,
            })
        } else if (type === 'connect' && this.state.isRestarting) {
            this.updateState({ connectionStatus: ConnectionStatus.CONNECTED })
        } else if (type === 'console') {
            this.emit('console', { message })
        } else if (type === 'error') {
            this.emit('error', { message })
            this.restart()
        }
    }

    private firmwareCheck(): void {
        this.updateState({ firmwareStatus: FirmwareStatus.CHECKING })
        this.write(COMMANDS.FIRMWARE_CHECK)

        this.firmwareCheckTimeout = setTimeout(() => {
            const hasWrongVersion =
                this.state.firmwareVersion !== CURRENT_FIRMWARE_VERSION

            if (
                (!this.firmwareConfirmed && this.responded) ||
                (this.responded && hasWrongVersion)
            ) {
                const errorMessage = `The firmware running on the Ro/Box (${this.state.firmwareVersion}) is out of date! Please update it.`
                this.updateState({
                    connectionStatus: ConnectionStatus.DISCONNECTED,
                    firmwareStatus: FirmwareStatus.OUT_OF_DATE,
                })
                this.emit('error', { message: errorMessage })
            } else if (!this.firmwareConfirmed && !this.responded) {
                const errorMessage =
                    'Ro/Box did not respond to the firmware check! Please try disconnecting and reconnecting it. If this issue persists, try reflashing the Ro/Box.'
                this.updateState({
                    connectionStatus: ConnectionStatus.DISCONNECTED,
                    firmwareStatus: FirmwareStatus.NO_RESPONSE,
                })
                this.emit('error', { message: errorMessage })
            }
        }, 1000)
    }

    write(command: string | string[]): void {
        this.communication?.write(command).catch((error) => {
            const message =
                error instanceof Error ? error.message : String(error)
            this.emit('error', { message })
        })
    }

    restart(): void {
        this.updateState({
            connectionStatus: ConnectionStatus.RESTARTING,
            isRestarting: true,
        })
        this.communication?.write(COMMANDS.RESTART)
    }

    bootloaderMode(): void {
        this.communication?.write(COMMANDS.BOOTLOADER)
    }

    request(): void {
        this.updateState({ connectionStatus: ConnectionStatus.CONNECTING })
        this.communication?.request().catch(() => {
            toast.warning({
                title: 'Connection Cancelled',
                message: 'Ro/Box connection was cancelled.',
            })
        })
    }

    colorCalibrate(): void {
        this.communication?.write(COMMANDS.CALIBRATE_COLOR)
    }

    async sendCode(code: string): Promise<void> {
        if (!this.communication)
            return Promise.reject(new Error('No communication method set'))
        this.updateState({ connectionStatus: ConnectionStatus.LOADING })
        await this.communication.write(COMMANDS.START_UPLOAD)
        await this.communication.write(code)
        await this.communication.write(COMMANDS.END_UPLOAD)
        return Promise.resolve()
    }

    runCode(): void {
        this.communication?.write(COMMANDS.START_PROGRAM)
        this.updateState({ connectionStatus: ConnectionStatus.RUNNING })
    }
}

export const pico = new Pico()
