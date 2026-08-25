/**
 * Web Bluetooth transport (Chromium desktop and Android). Chunking, pacing,
 * framing and error handling are shared with the iOS plugin transport in
 * `bleTransport.ts` and `transportBase.ts`.
 */

import { UART_CHARACTERISTIC, UART_SERVICE } from './protocol'
import { BleTransport, NOT_FOUND_MESSAGE } from './bleTransport'
import { errorMessage } from './framing'

/** 16-bit UUID expanded to the full Bluetooth base UUID. */
function numberToUUID(value: number): string {
    return `0000${value.toString(16).padStart(4, '0')}-0000-1000-8000-00805f9b34fb`
}

const SERVICE_UUID = numberToUUID(UART_SERVICE)
const CHARACTERISTIC_UUID = numberToUUID(UART_CHARACTERISTIC)

export class BluetoothCommunication extends BleTransport {
    private device: BluetoothDevice | null = null
    private server: BluetoothRemoteGATTServer | null = null
    private characteristic: BluetoothRemoteGATTCharacteristic | null = null

    private readonly valueChangedBound = this.valueChanged.bind(this)
    private readonly disconnectedBound = this.handleDisconnected.bind(this)

    async request(): Promise<void> {
        try {
            const device = await navigator.bluetooth.requestDevice({
                filters: [{ services: [SERVICE_UUID] }],
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

    async connect(device: BluetoothDevice): Promise<void> {
        this.device = device
        this.server = (await device.gatt?.connect()) ?? null

        const service = (await this.server?.getPrimaryService(SERVICE_UUID)) ?? null
        this.characteristic =
            (await service?.getCharacteristic(CHARACTERISTIC_UUID)) ?? null

        if (!this.server || !this.characteristic) {
            throw new Error('Could not connect to Ro/Box! Try resetting it?')
        }

        await this.characteristic.startNotifications()
        this.device.addEventListener(
            'gattserverdisconnected',
            this.disconnectedBound,
        )
        this.read()
    }

    read(): void {
        this.characteristic?.addEventListener(
            'characteristicvaluechanged',
            this.valueChangedBound,
        )
    }

    protected async writeChunk(chunk: Uint8Array<ArrayBuffer>): Promise<void> {
        // Fire-and-forget: writeValueWithResponse costs a round trip per
        // 20 bytes, which the upload path cannot afford.
        await this.characteristic?.writeValueWithoutResponse(chunk)
    }

    private valueChanged(event: Event): void {
        const target = event.target as BluetoothRemoteGATTCharacteristic | null
        const value = target?.value
        if (!value) return

        this.ingestBytes(value)
    }

    private handleDisconnected(event: Event): void {
        const device = event.target as BluetoothDevice | null
        if (device?.name?.startsWith('RoBox')) {
            void this.parent.disconnect()
        }
    }

    async disconnect(): Promise<void> {
        try {
            this.device?.removeEventListener(
                'gattserverdisconnected',
                this.disconnectedBound,
            )

            if (this.server?.connected && this.characteristic) {
                await this.characteristic.stopNotifications()
                this.characteristic.removeEventListener(
                    'characteristicvaluechanged',
                    this.valueChangedBound,
                )
            }

            if (this.server?.connected) {
                this.server.disconnect()
            }

            this.device = null
            this.server = null
            this.characteristic = null
            this.resetBuffer()
        } catch (error) {
            throw new Error(
                errorMessage(error, 'Could not disconnect from Ro/Box!'),
            )
        }
    }
}
