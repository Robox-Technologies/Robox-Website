import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { Pico } from '@/libs/communication/communicate'
import { BaseTransport } from '@/libs/communication/transportBase'
import { FrameReader, Kind, encodeFrame } from '@/libs/communication/frames'
import { ControllerLink } from '../protocol/controllerLink'
import {
    CONTROLLER_MODE_COMMAND,
    CONTROLLER_MODE_REPLY,
    CONTROLLER_TIMEOUT_MS,
    HOST_START,
    HostPacket,
    MIN_SEND_INTERVAL_MS,
    PACKET_LENGTH,
    crc8,
    signedByte,
} from '../protocol/packets'

const encoder = new TextEncoder()
const decoder = new TextDecoder()

interface Packet {
    type: number
    a: number
    b: number
    at: number
}

/** Plays the board: answers the firmware check, confirms controller mode with a framed reply, then reads packets. */
class FakeBoard extends BaseTransport {
    commands: string[] = []
    packets: Packet[] = []
    controllerMode = false
    /** When false the board hears everything but says nothing. */
    answers = true
    /** When set, the board refuses controller mode with this error. */
    refuseWith: string | null = null

    private readonly commandFrames = new FrameReader()

    async request(): Promise<void> {}
    async connect(): Promise<void> {}
    async disconnect(): Promise<void> {}
    read(): void {}

    protected async sendRaw(data: Uint8Array): Promise<void> {
        if (this.controllerMode) {
            // The host writes exactly one packet per call.
            expect(data.length).toBe(PACKET_LENGTH)
            expect(data[0]).toBe(HOST_START)
            expect(crc8(data.subarray(1, 5))).toBe(data[5])
            this.receive({
                type: data[1],
                a: data[3],
                b: data[4],
                at: Date.now(),
            })
            return
        }

        for (const frame of this.commandFrames.feed(data).frames) {
            if (frame.kind !== Kind.COMMAND) continue
            const name = decoder.decode(frame.payload)
            this.commands.push(name)
            if (name !== CONTROLLER_MODE_COMMAND || !this.answers) continue
            if (this.refuseWith) {
                this.reply('error', this.refuseWith)
                continue
            }
            this.reply(CONTROLLER_MODE_REPLY, 'ready')
            this.controllerMode = true
        }
    }

    private receive(packet: Packet): void {
        this.packets.push(packet)
        if (packet.type === HostPacket.EXIT) this.controllerMode = false
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
    it('switches over once the board confirms', async () => {
        const { pico, board, link } = await started()

        expect(board.commands).toContain(CONTROLLER_MODE_COMMAND)
        expect(link.state).toBe('active')
        expect(pico.getState().rawMode).toBe(true)
    })

    it('stays framed and gives up when the board never confirms', async () => {
        const { pico, board, link } = await connectedPico()
        board.answers = false

        const starting = link.start()
        const outcome = expect(starting).rejects.toThrow("didn't answer")
        await vi.advanceTimersByTimeAsync(2000)
        await outcome

        expect(link.state).toBe('idle')
        expect(pico.getState().rawMode).toBe(false)
        expect(board.packets).toEqual([])
    })

    it('reports the board refusing controller mode', async () => {
        const { pico, board, link } = await connectedPico()
        board.refuseWith = 'A program is running'

        await expect(link.start()).rejects.toThrow('A program is running')
        expect(link.state).toBe('idle')
        expect(pico.getState().rawMode).toBe(false)
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

    it('sends a zero DRIVE ahead of a pending one on stop', async () => {
        const { board, link } = await started()
        link.setDrive(80, 80)
        link.setDrive(90, 90)
        link.stop()
        await vi.advanceTimersByTimeAsync(MIN_SEND_INTERVAL_MS * 2)

        expect(board.drives()).toContainEqual([0, 0])
        expect(board.drives()).not.toContainEqual([90, 90])
    })

    it('ignores input before it has started', async () => {
        const { board, link } = await connectedPico()
        link.setDrive(50, 50)
        await vi.advanceTimersByTimeAsync(200)
        expect(board.packets).toEqual([])
    })
})

describe('timeout', () => {
    it('never leaves a gap the board would time out on', async () => {
        const { board, link } = await started()
        link.setDrive(40, 40)
        await vi.advanceTimersByTimeAsync(2000)

        const times = board.packets.map((p) => p.at)
        const gaps = times.slice(1).map((at, i) => at - times[i])
        expect(Math.max(...gaps)).toBeLessThan(CONTROLLER_TIMEOUT_MS / 2)
    })
})

describe('ending', () => {
    it('stops, exits, and hands the link back to the framed protocol', async () => {
        const { pico, board, link } = await started()
        link.setDrive(30, 30)

        await link.close()

        expect(board.types().slice(-2)).toEqual([
            HostPacket.DRIVE,
            HostPacket.EXIT,
        ])
        expect(board.drives().at(-1)).toEqual([0, 0])
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
