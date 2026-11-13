import { describe, expect, it } from 'vitest'

import vectors from './vectors/controller.json'
import {
    BOARD_START,
    HOST_START,
    HostPacket,
    PacketReader,
    crc8,
    encodeDrive,
    encodePacket,
    signedByte,
    speedByte,
} from '../protocol/packets'

describe('crc8', () => {
    it.each(vectors.crc8)(
        'matches the board for $input.length bytes',
        ({ input, crc }) => {
            expect(crc8(input)).toBe(crc)
        },
    )
})

describe('encoding', () => {
    it.each(vectors.packets)('$name', ({ start, type, seq, a, b, bytes }) => {
        expect(Array.from(encodePacket(type, seq, a, b, start))).toEqual(bytes)
    })

    it('encodes DRIVE speeds as int8, clamped to ±100', () => {
        const packet = encodeDrive(3, -250, 42.6)
        expect(signedByte(packet[3])).toBe(-100)
        expect(signedByte(packet[4])).toBe(43)
        expect(packet[1]).toBe(HostPacket.DRIVE)
    })

    it('round-trips signed speeds', () => {
        for (const speed of [-100, -1, 0, 1, 100]) {
            expect(signedByte(speedByte(speed))).toBe(speed)
        }
    })
})

describe('PacketReader', () => {
    const boardPackets = vectors.packets.filter((p) => p.start === BOARD_START)
    const bytes = boardPackets.flatMap((p) => p.bytes)

    it('reads packets split at every possible point', () => {
        for (let cut = 0; cut <= bytes.length; cut += 1) {
            const reader = new PacketReader()
            const packets = [
                ...reader.feed(new Uint8Array(bytes.slice(0, cut))),
                ...reader.feed(new Uint8Array(bytes.slice(cut))),
            ]
            expect(packets.map((p) => p.type)).toEqual(
                boardPackets.map((p) => p.type),
            )
        }
    })

    it('resyncs past noise, a stray start byte, and a corrupted packet', () => {
        const reader = new PacketReader()
        const good = boardPackets[0].bytes
        const corrupted = [...good]
        corrupted[3] ^= 0xff

        const packets = reader.feed(
            new Uint8Array([
                0x01,
                0x30,
                BOARD_START,
                ...corrupted,
                0x0a,
                ...good,
            ]),
        )

        expect(packets).toHaveLength(1)
        expect(packets[0].a).toBe(boardPackets[0].a & 0xff)
        expect(reader.discarded).toBeGreaterThan(0)
    })

    it('ignores packets headed the other way', () => {
        const reader = new PacketReader()
        const echoed = encodePacket(HostPacket.PING, 1, 0, 0, HOST_START)
        expect(reader.feed(echoed)).toEqual([])
    })
})
