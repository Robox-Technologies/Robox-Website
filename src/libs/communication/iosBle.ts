/** iOS Bluetooth via the Capacitor BLE plugin; Web Bluetooth doesn't exist in the WebView. */

import {
    BleClient,
    numbersToDataView,
    numberToUUID,
    type BleDevice,
} from '@capacitor-community/bluetooth-le'

import { UART_CHARACTERISTIC, UART_SERVICE } from './protocol'
import { BleTransport, NOT_FOUND_MESSAGE } from './bleTransport'
import { errorMessage } from './transportBase'

const SERVICE_UUID = numberToUUID(UART_SERVICE)
const CHARACTERISTIC_UUID = numberToUUID(UART_CHARACTERISTIC)

export class IOSBluetoothCommunication extends BleTransport {
    private deviceId: string | null = null

    /** Guards re-entrancy: `BleClient.disconnect()` can itself fire the plugin's onDisconnect callback. */
    private disconnecting = false

    private readonly notificationBound = this.handleNotification.bind(this)
    private readonly disconnectedBound = this.handleDisconnected.bind(this)

    /** Shows the native picker and hands the choice to the shared connect path. */
    async request(): Promise<void> {
        try {
            await BleClient.initialize()

            const device = await BleClient.requestDevice({
                services: [SERVICE_UUID],
                displayMode: 'list',
            })

            if (!device) {
                this.reportError(NOT_FOUND_MESSAGE)
                return
            }

            await this.parent.connect(device)
        } catch (error) {
            this.handleRequestFailure(error)
        }
    }

    async connect(device: BleDevice): Promise<void> {
        const { deviceId } = device

        try {
            this.deviceId = deviceId
            await BleClient.connect(deviceId, this.disconnectedBound)
            this.read()
        } catch (error) {
            this.deviceId = null
            this.resetBuffer()
            throw new Error(errorMessage(error, 'Could not connect to Ro/Box'))
        }
    }

    /**
     * Rejoins the same already-permitted device - e.g. after a rename, where
     * the AT09 module drops the link on its own and comes back advertising
     * under its new name, but the underlying device identity (and this
     * permission grant) is unchanged. Skips `requestDevice()` entirely.
     */
    async reconnect(): Promise<void> {
        if (!this.deviceId) {
            throw new Error('No previously connected Ro/Box to reconnect to.')
        }

        try {
            await BleClient.connect(this.deviceId, this.disconnectedBound)
            this.read()
        } catch (error) {
            throw new Error(errorMessage(error, 'Could not connect to Ro/Box'))
        }
    }

    read(): void {
        if (!this.deviceId) return

        void BleClient.startNotifications(
            this.deviceId,
            SERVICE_UUID,
            CHARACTERISTIC_UUID,
            this.notificationBound,
        )
    }

    protected async writeChunk(chunk: Uint8Array<ArrayBuffer>): Promise<void> {
        if (!this.deviceId) throw new Error('Not connected')

        await BleClient.writeWithoutResponse(
            this.deviceId,
            SERVICE_UUID,
            CHARACTERISTIC_UUID,
            numbersToDataView(Array.from(chunk)),
        )
    }

    private handleNotification(value: DataView): void {
        this.ingestBytes(
            new Uint8Array(value.buffer, value.byteOffset, value.byteLength),
        )
    }

    private handleDisconnected(deviceId: string): void {
        if (this.deviceId && deviceId === this.deviceId) {
            void this.parent.disconnect()
        }
    }

    async disconnect(): Promise<void> {
        if (!this.deviceId || this.disconnecting) return

        const deviceId = this.deviceId
        // `deviceId` is deliberately kept (unlike the old teardown here) -
        // it's what `reconnect()` rejoins without a fresh `requestDevice()`
        // picker (e.g. after a rename). `disconnecting` guards re-entrancy
        // instead: a disconnect callback fired by the plugin during teardown
        // now no-ops here rather than recursing back into `parent.disconnect`.
        this.disconnecting = true
        this.resetBuffer()

        try {
            await BleClient.disconnect(deviceId)
        } catch (error) {
            throw new Error(
                errorMessage(error, 'Could not disconnect from Ro/Box'),
            )
        } finally {
            this.disconnecting = false
        }
    }
}
