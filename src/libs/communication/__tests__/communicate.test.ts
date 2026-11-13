/** Connection lifecycle: what the website tells the board, and what it survives. */

import { describe, expect, it, vi } from 'vitest'

import { Pico } from '../communicate'
import { BaseTransport } from '../transportBase'
import { BluetoothCommunication } from '../webBle'
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

describe('a dropped Bluetooth link', () => {
    it('propagates whatever the device is called', () => {
        const pico = new Pico()
        const transport = new BluetoothCommunication(pico)

        let disconnected = false
        pico.disconnect = async () => {
            disconnected = true
        }

        // Boards are named things like Robox20. Filtering this event on a
        // 'RoBox' prefix left the app in CONNECTED with nothing behind it.
        ;(
            transport as unknown as {
                handleDisconnected: (event: Event) => void
            }
        ).handleDisconnected({
            target: { name: 'Robox20' },
        } as unknown as Event)

        expect(disconnected).toBe(true)
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

        expect(pico.getState().connectionStatus).toBe(
            ConnectionStatus.RESTARTING,
        )
        // restart() fires the write without awaiting it, and every write now
        // goes through BaseTransport's send queue - a microtask hop that
        // wasn't there before - so this can't be asserted synchronously.
        await vi.waitFor(() => {
            expect(transport.commands()).toContain(COMMANDS.RESTART)
        })
    })
})

describe('raw mode', () => {
    async function ready() {
        const setup = connected()
        await setup.pico.connect({} as never)
        setup.transport.reply('firmware', '2.2.0+proto2')
        return setup
    }

    it('is refused until the firmware check has passed', async () => {
        const { pico } = connected()
        await pico.connect({} as never)

        await expect(pico.enterRawMode()).rejects.toThrow('raw mode')
        expect(pico.getState().rawMode).toBe(false)
    })

    it('hands received bytes over untouched, high bytes included', async () => {
        const { pico, transport } = await ready()
        const received: number[] = []
        pico.on('raw', (data) => received.push(...data))

        await pico.enterRawMode()
        ;(
            transport as unknown as {
                ingestBytes: (data: Uint8Array) => void
            }
        ).ingestBytes(new Uint8Array([0x01, 0xff, 0x80, 0x0a]))

        expect(received).toEqual([0x01, 0xff, 0x80, 0x0a])
    })

    it('does not parse frames while raw', async () => {
        const { pico, transport } = await ready()
        const consoles: string[] = []
        pico.on('console', (event) => consoles.push(event.message))

        await pico.enterRawMode()
        transport.reply('console', 'hello')

        expect(consoles).toEqual([])
    })

    it('writes bytes exactly as given', async () => {
        const { pico, transport } = await ready()
        await pico.enterRawMode()
        transport.written = []

        await pico.writeBytes(new Uint8Array([0x02, 0x81, 0x7f]))

        expect(transport.written).toEqual([new Uint8Array([0x02, 0x81, 0x7f])])
    })

    it('sends the switch-over command before going raw', async () => {
        const { pico, transport } = await ready()

        await pico.enterRawMode('controller_mode')

        expect(transport.commands()).toEqual([
            COMMANDS.FIRMWARE_CHECK,
            'controller_mode',
        ])
        expect(pico.getState().rawMode).toBe(true)
    })

    it('refuses framed commands while raw', async () => {
        const { pico, transport, errors } = await ready()
        await pico.enterRawMode()

        await expect(transport.write(COMMANDS.STOP_MOTORS)).rejects.toThrow()
        expect(errors).toHaveLength(1)
        expect(transport.commands()).toEqual([COMMANDS.FIRMWARE_CHECK])
    })

    it('refuses raw writes outside raw mode', async () => {
        const { pico } = await ready()

        await expect(pico.writeBytes('hi')).rejects.toThrow('not in raw mode')
    })

    it('goes back to framed messages on exit', async () => {
        const { pico, transport } = await ready()
        const consoles: string[] = []
        pico.on('console', (event) => consoles.push(event.message))

        await pico.enterRawMode()
        pico.exitRawMode()
        transport.reply('console', 'hello')

        expect(consoles).toEqual(['hello'])
        expect(pico.getState().rawMode).toBe(false)
    })

    it('leaves raw mode on disconnect, still releasing the board', async () => {
        const { pico, transport } = await ready()
        await pico.enterRawMode()

        await pico.disconnect()

        expect(pico.getState().rawMode).toBe(false)
        expect(transport.rawMode).toBe(false)
        expect(transport.commands()).toContain(COMMANDS.DISCONNECT)
    })
})
