import type { BleDevice } from '@capacitor-community/bluetooth-le'
export interface Communication {
    destroyed: boolean
    request(): Promise<void>
    connect(port: SerialPort | BluetoothDevice | BleDevice): Promise<void>
    disconnect(): Promise<void>
    destroy(): Promise<void>
    write(message: string | string[]): Promise<void>
    read(): void
    initialize(): void
}
// Enums for better type safety
export enum ConnectionStatus {
    DISCONNECTED = 'disconnected',
    DISCONNECTING = 'disconnecting',
    RESTARTING = 'restarting',
    CONNECTING = 'connecting',
    CONNECTED = 'connected',
    LOADING = 'loading',
    RUNNING = 'running',
}

export enum FirmwareStatus {
    UNKNOWN = 'unknown',
    CHECKING = 'checking',
    UP_TO_DATE = 'upToDate',
    OUT_OF_DATE = 'outOfDate',
    NO_RESPONSE = 'noResponse',
}

export type CommunicationMethod = 'USB' | 'WebBluetooth' | 'iOSBluetooth' | null

// Types

/**
 * Message types the board can send.
 *
 * `calibrated` was missing here while the firmware was already sending it
 * (main.py, calibrate_color), so the framer treated every calibration
 * confirmation as noise and dropped it.
 */
export type PicoMessageType =
    | 'console'
    | 'download'
    | 'error'
    | 'firmware'
    | 'connect'
    | 'calibrated'
    | 'uploaded'

export interface PicoMessage {
    type: PicoMessageType
    message: unknown
}

export interface PicoState {
    connectionStatus: ConnectionStatus
    firmwareStatus: FirmwareStatus
    firmwareVersion: string
    isRestarting: boolean
    communicationMethod: CommunicationMethod
}

export interface PicoEventMap {
    stateChange: PicoState
    console: { message: string }
    calibrated: { message: string }
    downloaded: object
    /** The board's verdict on a framed upload: line count and CRC. */
    uploaded: unknown
    error: { message: string }
    firmware: { status: FirmwareStatus; version: string }
}
