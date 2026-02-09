export interface Communication {
    destroyed: boolean
    request(): Promise<void>
    connect(port: SerialPort | BluetoothDevice): Promise<void>
    disconnect(): Promise<void>
    destroy(): Promise<void>
    write(message: string | string[]): Promise<void>
    read(): void
    initialize(): void
}
// Enums for better type safety
export enum ConnectionStatus {
    DISCONNECTED = "disconnected",
    DISCONNECTING = "disconnecting",
    CONNECTING = "connecting",
    CONNECTED = "connected",
    LOADING = "loading",
    RUNNING = "running",
    ERROR = "error"
}

export enum FirmwareStatus {
    UNKNOWN = "unknown",
    CHECKING = "checking",
    UP_TO_DATE = "upToDate",
    OUT_OF_DATE = "outOfDate",
    NO_RESPONSE = "noResponse"
}

export type CommunicationMethod = "USB" | "Bluetooth" | null

// Types
export interface PicoMessage {
    type: "console" | "confirmation" | "error"
    message: string
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
    error: { message: string }
    revert: object
}