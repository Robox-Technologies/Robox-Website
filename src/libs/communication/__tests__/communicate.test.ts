/**
 * Connection lifecycle, as seen from the board: that the website tells the
 * board what it is doing, and survives what the link puts in front of a frame.
 */

import { describe, expect, it, vi } from 'vitest'

import { Pico } from '../communicate'
import { BaseTransport } from '../transportBase'
import { FrameReader, Kind, encodeFrame } from '../frames'
import { COMMANDS } from '../protocol'
import { ConnectionStatus, FirmwareStatus } from 'src/types/communication'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

/** Records what the host sends and lets a test answer as the board would. */
class FakeTransport extends BaseTransport {
    written: Uint8Array[] = []
    connects = 0
    disconnects = 0
    failWrites = false

    async request(): Promise<void> {}

    async connect(): Promise<void> {
        this.connects += 1
    }

    async disconnect(): Promise<void> {
        this.disconnects += 1
    }

    read(): void {}

    protected async sendRaw(data: Uint8Array): Promise<void> {
        if (this.failWrites) throw new Error('link is gone')
        this.written.push(new Uint8Array(data))
    }

    /** The command names the host has sent, in order. */
    commands(): string[] {
        const reader = new FrameReader()
        const names: string[] = []
        for (const chunk of this.written) {
            for (const frame of reader.feed(chunk).frames) {
                if (frame.kind === Kind.COMMAND) {
                    names.push(decoder.decode(frame.payload))
                }
            }
        }
        return names
    }

    /** Push text at the host exactly as it arrived on the link. */
    deliver(text: string): void {
        this.ingestBytes(encoder.encode(text))
    }

    /** Answer as the board does: one REPLY frame carrying a device message. */
    reply(type: string, message: unknown): void {
        this.ingestBytes(
            encodeFrame(
                0,
                Kind.REPLY,
                encoder.encode(JSON.stringify({ type, message })),
            ),
        )
    }
}

function connected() {
    const pico = new Pico()
    const transport = new FakeTransport(pico)
    // The constructor is the only way in; `communication` is deliberately
    // private, and a fake transport is the point of the test.
    ;(pico as unknown as { communication: BaseTransport }).communication =
        transport

    const errors: string[] = []
    pico.on('error', (event) => errors.push(event.message))

    return { pico, transport, errors }
}

describe('releasing the board', () => {
    it('sends disconnect_device before tearing the link down', async () => {
        const { pico, transport } = connected()

        await pico.connect({} as never)
        transport.reply('firmware', '2.0.0+proto2')
        expect(pico.getState().connectionStatus).toBe(
            ConnectionStatus.CONNECTED,
        )

        await pico.disconnect()

        expect(transport.commands()).toEqual([
            COMMANDS.FIRMWARE_CHECK,
            COMMANDS.DISCONNECT,
        ])
        expect(transport.disconnects).toBe(1)
    })

    it('releases the board before swapping the transport out', async () => {
        const { pico, transport } = connected()

        await pico.connect({} as never)
        transport.reply('firmware', '2.0.0+proto2')

        // Switching the toggle from USB to Bluetooth. Without the release the
        // board keeps claiming USB.
        await pico.setCommunicationMethod('WebBluetooth')

        expect(transport.commands()).toContain(COMMANDS.DISCONNECT)
    })

    it('stays quiet when the link has already dropped', async () => {
        const { pico, transport, errors } = connected()

        await pico.connect({} as never)
        transport.reply('firmware', '2.0.0+proto2')

        // An unexpected disconnect: the transport is there, but dead.
        transport.failWrites = true
        await pico.disconnect()

        expect(errors).toEqual([])
        expect(pico.getState().connectionStatus).toBe(
            ConnectionStatus.DISCONNECTED,
        )
    })
})

describe('module chatter on the shared link', () => {
    it('does not swallow the frame it arrives glued to', async () => {
        const { pico, transport } = connected()

        await pico.connect({} as never)

        // The module reports link state on the same UART and terminates none
        // of it, so it lands in front of the next frame.
        transport.deliver('OK+CONN')
        transport.reply('firmware', '2.0.0+proto2')

        expect(pico.getState().firmwareStatus).toBe(FirmwareStatus.UP_TO_DATE)
        expect(pico.getState().connectionStatus).toBe(
            ConnectionStatus.CONNECTED,
        )
    })

    it('cannot grow the receive buffer without bound', async () => {
        const { pico, transport } = connected()

        await pico.connect({} as never)
        for (let i = 0; i < 2000; i += 1) transport.deliver('OK+LOST')

        // And the link still works afterwards.
        transport.reply('firmware', '2.0.0+proto2')
        expect(pico.getState().firmwareStatus).toBe(FirmwareStatus.UP_TO_DATE)
    })
})

describe('a refused firmware check', () => {
    it("reports the board's reason instead of blaming its firmware", async () => {
        vi.useFakeTimers()
        try {
            const { pico, transport, errors } = connected()

            await pico.connect({} as never)
            transport.reply('error', 'Already connected over another interface')

            expect(errors).toHaveLength(1)
            expect(errors[0]).toContain(
                'Already connected over another interface',
            )
            // Saying otherwise sends the user off to reflash a healthy board.
            expect(errors[0]).not.toContain('firmware 2.0.0')
            expect(pico.getState().firmwareStatus).toBe(FirmwareStatus.UNKNOWN)
            expect(pico.getState().connectionStatus).toBe(
                ConnectionStatus.DISCONNECTED,
            )

            // Useless as well as rude: the reset would go over the interface
            // that just refused us.
            expect(transport.commands()).toEqual([COMMANDS.FIRMWARE_CHECK])

            // And no second, contradictory complaint when it times out.
            await vi.advanceTimersByTimeAsync(10_000)
            expect(errors).toHaveLength(1)
        } finally {
            vi.useRealTimers()
        }
    })

    it('still restarts the board on an error outside a check', async () => {
        const { pico, transport } = connected()

        await pico.connect({} as never)
        transport.reply('firmware', '2.0.0+proto2')
        transport.reply('error', 'ZeroDivisionError: divide by zero')

        expect(transport.commands()).toContain(COMMANDS.RESTART)
        expect(pico.getState().connectionStatus).toBe(
            ConnectionStatus.RESTARTING,
        )
    })
})
