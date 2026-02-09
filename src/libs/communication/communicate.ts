import type { Communication, PicoEventMap, CommunicationMethod, PicoState, PicoMessage } from "src/types/communication";

import { ConnectionStatus, FirmwareStatus } from "src/types/communication";

import { USBCommunication } from "./usb"
import { BluetoothCommunication } from "./webBle"


const COMMANDS = {
    FIRMWARE_CHECK: "x01FIRMCHECK\r",
    START_UPLOAD: "x02BEGINUPLD\r",
    END_UPLOAD: "x03ENDUPLD\r",
    START_PROGRAM: "x04STARTPROG\r",
    CALIBRATE_COLOR: "x05COLORCALIBRATE\r",
    RESTART: "x06RESTART\r",
    BOOTLOADER: "x07BOOTLOADER\r",
    KEYBOARD_INTERRUPT: "\x03\n"
} as const



type PicoEventListener<K extends keyof PicoEventMap> = (data: PicoEventMap[K]) => void




const CURRENT_FIRMWARE_VERSION = "1.0.0"


export class Pico {
    private communication: Communication | null
    private state: PicoState
    private listeners: Map<keyof PicoEventMap, Set<PicoEventListener<any>>>
    private firmwareCheckTimeout: ReturnType<typeof setTimeout> | null = null
    private responded: boolean = false
    private firmwareConfirmed: boolean = false

    constructor() {
        this.communication = null
        this.listeners = new Map()
        this.state = {
            connectionStatus: ConnectionStatus.DISCONNECTED,
            firmwareStatus: FirmwareStatus.UNKNOWN,
            firmwareVersion: "0.0.0",
            isRestarting: false,
            communicationMethod: null
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
    on<K extends keyof PicoEventMap>(event: K, listener: PicoEventListener<K>): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set())
        }
        this.listeners.get(event)!.add(listener)
    }

    off<K extends keyof PicoEventMap>(event: K, listener: PicoEventListener<K>): void {
        this.listeners.get(event)?.delete(listener)
    }

    emit<K extends keyof PicoEventMap>(event: K, data: PicoEventMap[K]): void {
        this.listeners.get(event)?.forEach(listener => listener(data))
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
            isRestarting: false
        })

        if (method === "USB") {
            this.communication = new USBCommunication(this)
        } else if (method === "Bluetooth") {
            this.communication = new BluetoothCommunication(this)
        }

        this.communication?.initialize()
    }

    async connect(port: SerialPort | BluetoothDevice): Promise<void> {
        if (!this.communication) {
            throw new Error("Communication method not set")
        }

        try {
            await this.communication.connect(port)
            
            
            
            this.firmwareCheck()
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error)
            this.updateState({
                connectionStatus: ConnectionStatus.ERROR,
            })
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
            const message = error instanceof Error ? error.message : String(error)
            this.emit('error', { message })
        }
    }

    handleMessage(payload: PicoMessage): void {
        const { type, message } = payload

        // First message means we're connected
        if (!this.responded) {
            this.responded = true
        }


        if (type === "confirmation") {
            this.firmwareConfirmed = true
            this.updateState({
                firmwareStatus: FirmwareStatus.UP_TO_DATE,
                connectionStatus: ConnectionStatus.CONNECTED,
                firmwareVersion: message
            })
        } else if (type === "console") {
            this.emit('console', { message })
        } else if (type === "error") {
            this.emit('error', { message })
            // We disconnect on error because the Ro/Box is likely in a bad state if it's sending error messages
            this.disconnect()
        }
    }

    private firmwareCheck(): void {
        this.updateState({ firmwareStatus: FirmwareStatus.CHECKING })
        this.write(COMMANDS.FIRMWARE_CHECK)

        this.firmwareCheckTimeout = setTimeout(() => {
            const hasWrongVersion = this.state.firmwareVersion !== CURRENT_FIRMWARE_VERSION

            if ((!this.firmwareConfirmed && this.responded) || (this.responded && hasWrongVersion)) {
                const errorMessage = `The firmware running on the Ro/Box (${this.state.firmwareVersion}) is out of date! Please update it.`
                this.updateState({
                    connectionStatus: ConnectionStatus.DISCONNECTED,
                    firmwareStatus: FirmwareStatus.OUT_OF_DATE,
                })
                this.emit('error', { message: errorMessage })
            } else if (!this.firmwareConfirmed && !this.responded) {
                const errorMessage = "Ro/Box did not respond to the firmware check! Please try disconnecting and reconnecting it. If this issue persists, try reflashing the Ro/Box."
                this.updateState({
                    connectionStatus: ConnectionStatus.DISCONNECTED,
                    firmwareStatus: FirmwareStatus.NO_RESPONSE,
                })
                this.emit('error', { message: errorMessage })
            }
        }, 1000)
    }

    write(command: string | string[]): void {
        this.communication?.write(command).catch(error => {
            const message = error instanceof Error ? error.message : String(error)
            this.emit('error', { message })
        })
    }

    restart(): void {
        this.updateState({ 
            connectionStatus: ConnectionStatus.DISCONNECTING,
            isRestarting: true
        })
        this.communication?.write(COMMANDS.RESTART)
    }

    bootloaderMode(): void {
        this.communication?.write(COMMANDS.BOOTLOADER)
    }

    request(): void {
        this.updateState({ connectionStatus: ConnectionStatus.CONNECTING })
        this.communication?.request()
    }

    colorCalibrate(): void {
        this.communication?.write(COMMANDS.CALIBRATE_COLOR)
    }

    async sendCode(code: string): Promise<void> {
        if (!this.communication) return
        this.updateState({ connectionStatus: ConnectionStatus.LOADING })
        await this.communication.write(COMMANDS.START_UPLOAD)
        await this.communication.write(code)
        await this.communication.write(COMMANDS.END_UPLOAD)
    }

    runCode(): void {
        this.communication?.write(COMMANDS.START_PROGRAM)
        this.updateState({ connectionStatus: ConnectionStatus.RUNNING })
    }
}

export const pico = new Pico()
