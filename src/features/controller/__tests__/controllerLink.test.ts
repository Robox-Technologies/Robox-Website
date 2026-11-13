import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Pico } from '@/libs/communication/communicate'
import { BaseTransport } from '@/libs/communication/transportBase'
import { FrameReader, Kind, encodeFrame } from '@/libs/communication/frames'
import { ControllerLink } from '../protocol/controllerLink'
import {
    BOARD_START,
    BoardPacket,
    CONTROLLER_MODE_COMMAND,
    CONTROLLER_PROTOCOL_VERSION,
    HOST_START,
    HostPacket,
    MIN_SEND_INTERVAL_MS,
    PacketReader,
    encodePacket,
    signedByte,
    type Packet,
} from '../protocol/packets'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

/** Plays the board: answers the firmware check, enters controller mode on command, answers PINGs. */
class FakeBoard extends BaseTransport {
    commands: string[] = []
    packets: Packet[] = []
    controllerMode = false
    /** When false the board hears everything but says nothing. */
    answers = true
    protocolVersion = CONTROLLER_PROTOCOL_VERSION

    private readonly commandFrames = new FrameReader()
    private readonly hostPackets = new PacketReader(HOST_START)

    async request(): Promise<void> {}
    async connect(): Promise<void> {}
    async disconnect(): Promise<void> {}
    read(): void {}

    protected async sendRaw(data: Uint8Array): Promise<void> {
        if (this.controllerMode) {
            for (const packet of this.hostPackets.feed(data))
                this.receive(packet)
            return
        }

        for (const frame of this.commandFrames.feed(data).frames) {
            if (frame.kind !== Kind.COMMAND) continue
            const name = decoder.decode(frame.payload)
            this.commands.push(name)
            if (name === CONTROLLER_MODE_COMMAND) this.controllerMode = true
        }
    }

    private receive(packet: Packet): void {
        this.packets.push(packet)
        if (packet.type === HostPacket.EXIT) this.controllerMode = false
        if (packet.type === HostPacket.PING && this.answers) {
            const pong = encodePacket(
                BoardPacket.PONG,
                0,
                packet.seq,
                this.protocolVersion,
                BOARD_START,
            )
            setTimeout(() => this.ingestBytes(pong), 5)
        }
    }

    reply(type: string, message: unknown): void {
        const payload = encoder.encode(JSON.stringify({ type, message }))
        this.ingestBytes(encodeFrame(0, Kind.REPLY, payload))
    }

    drives(): Array<[number, number]> {
        return this.packets
            .filter((p) => p.type === HostPacket.DRIVE)
            .map((p) => [signedByte(p.a), signedByte(p.b)])
    }

    types(): number[] {
        return this.packets.map((p) => p.type)
    }
}

async function connectedPico(firmware = '2.3.0+proto2') {
    const pico = new Pico()
    pico.setToastsEnabled(false)
    const board = new FakeBoard(pico)
    ;(pico as unknown as { communication: BaseTransport }).communication = board

    await pico.connect({} as never)
    board.reply('firmware', firmware)
    await vi.advanceTimersByTimeAsync(0)

    return { pico, board, link: new ControllerLink(pico) }
}

async function started(firmware?: string) {
    const setup = await connectedPico(firmware)
    const starting = setup.link.start()
    await vi.advanceTimersByTimeAsync(50)
    await starting
    return setup
}

beforeEach(() => {
    vi.useFakeTimers()
})

afterEach(() => {
    vi.useRealTimers()
})

describe('starting the controller', () => {
    it('switches the board over and handshakes', async () => {
        const { pico, board, link } = await started()

        expect(board.commands).toContain(CONTROLLER_MODE_COMMAND)
        expect(board.types()[0]).toBe(HostPacket.PING)
        expect(link.state).toBe('active')
        expect(pico.getState().rawMode).toBe(true)
    })

    it('gives up and leaves raw mode when the board never answers', async () => {
        const { pico, board, link } = await connectedPico()
        board.answers = false

        const starting = link.start()
        const outcome = expect(starting).rejects.toThrow("didn't answer")
        await vi.advanceTimersByTimeAsync(2000)
        await outcome

        expect(link.state).toBe('idle')
        expect(pico.getState().rawMode).toBe(false)
        // It kept asking: the first PING can land before the board has switched.
        expect(
            board.types().filter((t) => t === HostPacket.PING).length,
        ).toBeGreaterThan(3)
    })

    it('refuses firmware older than the controller', async () => {
        const { pico, board, link } = await connectedPico('2.2.0+proto2')

        await expect(link.start()).rejects.toThrow('2.3.0')
        expect(board.commands).not.toContain(CONTROLLER_MODE_COMMAND)
        expect(pico.getState().rawMode).toBe(false)
    })

    it('refuses a board speaking another controller protocol', async () => {
        const { board, link } = await connectedPico()
        board.protocolVersion = CONTROLLER_PROTOCOL_VERSION + 1

        const starting = link.start()
        const outcome = expect(starting).rejects.toThrow('controller protocol')
        await vi.advanceTimersByTimeAsync(50)
        await outcome
        expect(link.state).toBe('idle')
    })
})

describe('driving', () => {
    it('sends only the latest value when input outruns the link', async () => {
        const { board, link } = await started()
        board.packets = []

        for (let speed = 1; speed <= 50; speed += 1) {
            link.setDrive(speed, -speed)
            await vi.advanceTimersByTimeAsync(1)
        }
        await vi.advanceTimersByTimeAsync(MIN_SEND_INTERVAL_MS)

        const drives = board.drives()
        expect(drives.length).toBeLessThanOrEqual(
            Math.ceil(50 / MIN_SEND_INTERVAL_MS) + 1,
        )
        expect(drives.at(-1)).toEqual([50, -50])
    })

    it('keeps re-sending the current value as a heartbeat', async () => {
        const { board, link } = await started()
        link.setDrive(40, 40)
        await vi.advanceTimersByTimeAsync(0)
        board.packets = []

        await vi.advanceTimersByTimeAsync(500)

        const drives = board.drives()
        expect(drives.length).toBeGreaterThanOrEqual(4)
        expect(drives.every(([l, r]) => l === 40 && r === 40)).toBe(true)
    })

    it('puts STOP ahead of a pending DRIVE', async () => {
        const { board, link } = await started()
        link.setDrive(80, 80)
        link.setDrive(90, 90)
        link.stop()
        await vi.advanceTimersByTimeAsync(MIN_SEND_INTERVAL_MS * 2)

        const types = board.types()
        const stopAt = types.indexOf(HostPacket.STOP)
        expect(stopAt).toBeGreaterThan(-1)
        expect(board.drives()).not.toContainEqual([90, 90])
    })

    it('ignores input before it has started', async () => {
        const { board, link } = await connectedPico()
        link.setDrive(50, 50)
        await vi.advanceTimersByTimeAsync(200)
        expect(board.packets).toEqual([])
    })
})

describe('link health', () => {
    it('measures round-trip time from PONGs', async () => {
        const { link } = await started()
        expect(link.stats().rttMs).toBe(5)
    })

    it('marks the link unresponsive when the board goes quiet, and recovers', async () => {
        const { board, link } = await started()
        const states: string[] = []
        link.on('state', (state) => states.push(state))

        board.answers = false
        await vi.advanceTimersByTimeAsync(1500)
        expect(link.state).toBe('unresponsive')

        board.answers = true
        await vi.advanceTimersByTimeAsync(1100)
        expect(link.state).toBe('active')
        expect(states).toEqual(['unresponsive', 'active'])
    })

    it('computes loss from the board’s STATUS counts', async () => {
        const { board, link } = await started()
        const status = (received: number) =>
            (
                board as unknown as { ingestBytes: (d: Uint8Array) => void }
            ).ingestBytes(
                encodePacket(BoardPacket.STATUS, 0, received, 0, BOARD_START),
            )

        status(0)
        for (let i = 0; i < 10; i += 1) {
            link.setDrive(i + 1, 0)
            await vi.advanceTimersByTimeAsync(MIN_SEND_INTERVAL_MS)
        }
        status(5)

        expect(link.stats().lossPercent).toBe(50)
    })
})

describe('ending', () => {
    it('stops, exits, and hands the link back to the framed protocol', async () => {
        const { pico, board, link } = await started()
        link.setDrive(30, 30)

        await link.close()

        expect(board.types().slice(-2)).toEqual([
            HostPacket.STOP,
            HostPacket.EXIT,
        ])
        expect(board.controllerMode).toBe(false)
        expect(link.state).toBe('idle')
        expect(pico.getState().rawMode).toBe(false)
    })

    it('goes idle when the Ro/Box disconnects', async () => {
        const { pico, link } = await started()

        await pico.disconnect()

        expect(link.state).toBe('idle')
        link.setDrive(10, 10)
    })
})
