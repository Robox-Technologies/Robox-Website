import type {
    Communication,
    PicoEventMap,
    CommunicationMethod,
    PicoState,
    PicoMessage,
    ColorReading,
} from 'src/types/communication'

import { ConnectionStatus, FirmwareStatus } from 'src/types/communication'
import { toast } from '@/libs/ui/toast'

import { USBCommunication } from './usb'
import { BluetoothCommunication } from './webBle'
import { IOSBluetoothCommunication } from './iosBle'
import {
    CALIBRATE_COLOR_COMMANDS,
    COMMANDS,
    MINIMUM_FIRMWARE_VERSION,
    RESET_COLOR_COMMANDS,
    SUPPORTED_PROTOCOL_VERSION,
    meetsMinimumVersion,
    parseFirmwareReply,
} from './protocol'
import type { PaletteColorName } from '@/data/colorPalette'
import { uploadProgram } from './uploader'
import { BaseTransport, errorMessage } from './transportBase'
import type { BleDevice } from '@capacitor-community/bluetooth-le'

type PicoEventListener<K extends keyof PicoEventMap> = (
    data: PicoEventMap[K],
) => void

type PicoEventHandler = (data: unknown) => void

/** Generous: the board's send throttle plus chunked writes can push a reply past half a second. */
const FIRMWARE_CHECK_TIMEOUT_MS = 2500

const revertStateMapping: Partial<Record<ConnectionStatus, ConnectionStatus>> =
    {
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
    private toastsEnabled: boolean = true

    /** Protocol the board speaks. 1 is the unframed legacy path. */
    private protocolVersion: number = 1

    /** Whether the program on the board arrived intact. Cleared when a new upload starts. */
    private uploadVerified: boolean = false

    /**
     * Lets a duplicate 'connect' join the attempt already running. A
     * `connectionStatus` check won't do: `request()` sets CONNECTING first.
     */
    private connectAttempt: Promise<void> | null = null

    /**
     * Whether a `colorCalibrate()`/`colorResetColor()` reply is outstanding, so
     * `handleMessage` can tell a refusal from a crashed program. Not used for
     * `colorMode()`, which has no success reply to clear it on.
     */
    private colorCommandPending: boolean = false

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

    // Off for callers with their own inline connection feedback (e.g. flash device).
    setToastsEnabled(enabled: boolean): void {
        this.toastsEnabled = enabled
    }

    /** Whether reconnecting to a previously authorised port/device happens automatically. */
    setAutoConnect(enabled: boolean): void {
        this.communication?.setAutoConnect(enabled)
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
        if (event === 'error' && this.toastsEnabled) {
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
            // Before the transport goes away: an interface can only be released over itself.
            await this.releaseBoard()
            await this.communication.destroy()
        }

        this.responded = false
        this.firmwareConfirmed = false
        this.protocolVersion = 1
        this.uploadVerified = false
        this.colorCommandPending = false
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
        const communication = this.communication
        if (!communication) {
            throw new Error('Communication method not set')
        }

        if (this.connectAttempt) return this.connectAttempt

        this.connectAttempt = this.attemptConnect(communication, port).finally(
            () => {
                this.connectAttempt = null
            },
        )

        return this.connectAttempt
    }

    private async attemptConnect(
        communication: Communication,
        port: SerialPort | BluetoothDevice | BleDevice,
    ): Promise<void> {
        this.updateState({ connectionStatus: ConnectionStatus.CONNECTING })

        try {
            await communication.connect(port)

            if (this.toastsEnabled) {
                toast.success({
                    title: 'Ro/Box Connected',
                    message: 'Your Ro/Box is connected and ready to run.',
                    durationMs: 3000,
                })
            }

            this.firmwareCheck()
        } catch (error) {
            this.revertConnectionState()
            this.emit('error', { message: errorMessage(error) })
        }
    }

    /** Guarded, because USB re-enumeration and flaky BLE report the same disconnect repeatedly. */
    async disconnect(): Promise<void> {
        if (!this.communication) return

        if (
            this.state.connectionStatus === ConnectionStatus.DISCONNECTING ||
            this.state.connectionStatus === ConnectionStatus.DISCONNECTED
        ) {
            return
        }

        this.updateState({ connectionStatus: ConnectionStatus.DISCONNECTING })

        try {
            await this.releaseBoard()

            this.responded = false
            this.firmwareConfirmed = false
            this.colorCommandPending = false
            this.clearFirmwareCheck()

            await this.communication.disconnect()
        } catch (error) {
            this.emit('error', { message: errorMessage(error) })
        } finally {
            this.updateState({
                connectionStatus: ConnectionStatus.DISCONNECTED,
                firmwareStatus: FirmwareStatus.UNKNOWN,
            })
        }
    }

    /** A message from the board. Host-side failures go through `emit('error')` instead. */
    handleMessage(payload: PicoMessage): void {
        const { type } = payload
        const message = String(payload.message)

        // First message means we're connected
        if (!this.responded) {
            this.responded = true
        }

        if (type === 'firmware') {
            const { version, protocol } = parseFirmwareReply(message)
            this.firmwareConfirmed = true
            this.protocolVersion = protocol

            const usable =
                protocol >= SUPPORTED_PROTOCOL_VERSION &&
                meetsMinimumVersion(version, MINIMUM_FIRMWARE_VERSION)

            if (!usable) {
                // No fallback: the unframed path can't detect its own failures.
                this.updateState({
                    firmwareStatus: FirmwareStatus.OUT_OF_DATE,
                    connectionStatus: ConnectionStatus.DISCONNECTED,
                    firmwareVersion: version,
                })
                this.emit('error', {
                    message: `This Ro/Box is running firmware ${version}, and ${MINIMUM_FIRMWARE_VERSION} or newer is required. Please update it before uploading.`,
                })
                return
            }

            this.clearFirmwareCheck()
            this.updateState({
                firmwareStatus: FirmwareStatus.UP_TO_DATE,
                connectionStatus: ConnectionStatus.CONNECTED,
                firmwareVersion: version,
            })
        } else if (type === 'connect' && this.state.isRestarting) {
            this.updateState({ connectionStatus: ConnectionStatus.CONNECTED })
        } else if (type === 'console') {
            this.emit('console', { message })
        } else if (type === 'download') {
            // The board confirming it finished writing program.py.
            this.emit('downloaded', {})
        } else if (type === 'calibrated') {
            this.colorCommandPending = false
            this.emit('calibrated', { message })
        } else if (type === 'color') {
            // A structured reading, so use the raw payload rather than the `message` coercion.
            this.emit('color', payload.message as ColorReading)
        } else if (type === 'uploaded') {
            this.emit('uploaded', payload.message)
        } else if (type === 'error') {
            // A refusal while the check is outstanding is the check's answer, not a crash.
            if (this.firmwareCheckPending()) {
                this.failFirmwareCheck(message)
                return
            }

            // Likewise a refused calibration/reset: the request's answer, not a crash.
            if (this.colorCommandPending) {
                this.colorCommandPending = false
                this.emit('error', { message })
                return
            }

            this.emit('error', { message })
            this.restart()
        }
    }

    /** Tell the board this client is done. Safe on every teardown path. */
    private async releaseBoard(): Promise<void> {
        await this.communication?.release()
    }

    /** True while the firmware check is still waiting for its answer. */
    private firmwareCheckPending(): boolean {
        return this.firmwareCheckTimeout !== null && !this.firmwareConfirmed
    }

    private clearFirmwareCheck(): void {
        if (!this.firmwareCheckTimeout) return

        clearTimeout(this.firmwareCheckTimeout)
        this.firmwareCheckTimeout = null
    }

    /** The board refused the firmware check, so leave the status UNKNOWN. */
    private failFirmwareCheck(reason: string): void {
        this.clearFirmwareCheck()
        this.updateState({
            connectionStatus: ConnectionStatus.DISCONNECTED,
            firmwareStatus: FirmwareStatus.UNKNOWN,
        })
        this.emit('error', {
            message: `The Ro/Box refused the connection: ${reason}. Turn it off and on again, then reconnect.`,
        })
    }

    private firmwareCheck(): void {
        this.updateState({ firmwareStatus: FirmwareStatus.CHECKING })
        this.write(COMMANDS.FIRMWARE_CHECK)

        this.firmwareCheckTimeout = setTimeout(() => {
            // Dropped first, so a later error reads as a board error, not this check's answer.
            this.firmwareCheckTimeout = null
            if (this.firmwareConfirmed) return

            if (this.responded) {
                // Not a firmware reply: pre-2.0.0 boards don't understand COMMAND frames.
                const message = `This Ro/Box did not report a usable firmware version. ${MINIMUM_FIRMWARE_VERSION} or newer is required, so please update it.`
                this.updateState({
                    connectionStatus: ConnectionStatus.DISCONNECTED,
                    firmwareStatus: FirmwareStatus.OUT_OF_DATE,
                })
                this.emit('error', { message })
            } else {
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
            if (this.toastsEnabled) {
                toast.warning({
                    title: 'Connection Cancelled',
                    message: 'Ro/Box connection was cancelled.',
                })
            }
        })
    }

    /** Calibrates one colour against a swatch. Independent per colour, but do white/black first. */
    colorCalibrate(name: PaletteColorName): void {
        this.colorCommandPending = true
        void this.communication?.write(CALIBRATE_COLOR_COMMANDS[name])
    }

    /** Clears one colour's calibration back to its default. */
    colorResetColor(name: PaletteColorName): void {
        this.colorCommandPending = true
        void this.communication?.write(RESET_COLOR_COMMANDS[name])
    }

    /** Streams periodic `color` readings. Any other command frame implicitly exits the mode. */
    colorMode(): void {
        void this.communication?.write(COMMANDS.COLOR_MODE)
    }

    /** Send a program and wait for the board to confirm it arrived intact. */
    async sendCode(code: string): Promise<void> {
        if (!(this.communication instanceof BaseTransport)) {
            throw new Error('No communication method set')
        }

        if (this.protocolVersion < SUPPORTED_PROTOCOL_VERSION) {
            throw new Error(
                `This Ro/Box needs firmware ${MINIMUM_FIRMWARE_VERSION} or newer before you can upload to it.`,
            )
        }

        this.uploadVerified = false
        this.updateState({ connectionStatus: ConnectionStatus.LOADING })

        try {
            await uploadProgram(this.communication, code)
            this.uploadVerified = true
        } catch (error) {
            this.updateState({ connectionStatus: ConnectionStatus.CONNECTED })
            this.emit('error', { message: errorMessage(error) })
            throw error
        }
    }

    runCode(): void {
        if (!this.uploadVerified) {
            this.emit('error', {
                message:
                    'Your program has not been sent to the Ro/Box yet, so there is nothing to run.',
            })
            return
        }

        void this.communication?.write(COMMANDS.START_PROGRAM)
        this.updateState({ connectionStatus: ConnectionStatus.RUNNING })
    }
}

export const pico = new Pico()
