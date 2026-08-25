import type {
    Communication,
    PicoEventMap,
    CommunicationMethod,
    PicoState,
    PicoMessage,
} from 'src/types/communication'

import { ConnectionStatus, FirmwareStatus } from 'src/types/communication'
import { toast } from '@/libs/ui/toast'

import { USBCommunication } from './usb'
import { BluetoothCommunication } from './webBle'
import { IOSBluetoothCommunication } from './iosBle'
import { COMMANDS, CURRENT_FIRMWARE_VERSION } from './protocol'
import { errorMessage } from './framing'
import type { BleDevice } from '@capacitor-community/bluetooth-le'

type PicoEventListener<K extends keyof PicoEventMap> = (
    data: PicoEventMap[K],
) => void

type PicoEventHandler = (data: unknown) => void

/**
 * The board's own send throttle plus the chunked write latency mean a reply can
 * take well over half a second to arrive, so this has to be generous or a
 * healthy board gets reported as unresponsive.
 */
const FIRMWARE_CHECK_TIMEOUT_MS = 2500

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

    // Public getters for state
    getState(): PicoState {
        return { ...this.state }
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
            this.emit('error', { message: errorMessage(error) })
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
            this.emit('error', { message: errorMessage(error) })
        }
    }

    /**
     * A message that genuinely came from the board.
     *
     * Host-side failures must not come through here: an `error` arriving from
     * the board restarts it, which is right for a crashed user program and very
     * wrong for a cancelled device picker. Transports call `emit('error')`
     * directly for their own failures.
     */
    handleMessage(payload: PicoMessage): void {
        const { type } = payload
        const message = String(payload.message)

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
        } else if (type === 'download') {
            // The board confirming it finished writing program.py. Previously
            // parsed and then dropped on the floor, which is why the run
            // command could be sent before the upload had landed.
            this.emit('downloaded', {})
        } else if (type === 'calibrated') {
            this.emit('calibrated', { message })
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
                const message = `The firmware running on the Ro/Box (${this.state.firmwareVersion}) is out of date! Please update it.`
                this.updateState({
                    connectionStatus: ConnectionStatus.DISCONNECTED,
                    firmwareStatus: FirmwareStatus.OUT_OF_DATE,
                })
                this.emit('error', { message })
            } else if (!this.firmwareConfirmed && !this.responded) {
                const message =
                    'Ro/Box did not respond to the firmware check! Please try disconnecting and reconnecting it. If this issue persists, try reflashing the Ro/Box.'
                this.updateState({
                    connectionStatus: ConnectionStatus.DISCONNECTED,
                    firmwareStatus: FirmwareStatus.NO_RESPONSE,
                })
                this.emit('error', { message })
            }
        }, FIRMWARE_CHECK_TIMEOUT_MS)
    }

    write(command: string | string[]): void {
        this.communication?.write(command).catch((error) => {
            this.emit('error', { message: errorMessage(error) })
        })
    }

    restart(): void {
        this.updateState({
            connectionStatus: ConnectionStatus.RESTARTING,
            isRestarting: true,
        })
        void this.communication?.write(COMMANDS.RESTART)
    }

    bootloaderMode(): void {
        void this.communication?.write(COMMANDS.BOOTLOADER)
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
        void this.communication?.write(COMMANDS.CALIBRATE_COLOR)
    }

    async sendCode(code: string): Promise<void> {
        if (!this.communication) {
            throw new Error('No communication method set')
        }

        this.updateState({ connectionStatus: ConnectionStatus.LOADING })
        await this.communication.write(COMMANDS.START_UPLOAD)
        await this.communication.write(code)
        await this.communication.write(COMMANDS.END_UPLOAD)
    }

    runCode(): void {
        void this.communication?.write(COMMANDS.START_PROGRAM)
        this.updateState({ connectionStatus: ConnectionStatus.RUNNING })
    }
}

export const pico = new Pico()
