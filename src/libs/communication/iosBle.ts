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
        if (!this.deviceId) return

        const deviceId = this.deviceId
        // Cleared first so a disconnect callback fired by the plugin during
        // teardown does not recurse back into `parent.disconnect`.
        this.deviceId = null
        this.resetBuffer()

        try {
            await BleClient.disconnect(deviceId)
        } catch (error) {
            throw new Error(
                errorMessage(error, 'Could not disconnect from Ro/Box'),
            )
        }
    }
}
