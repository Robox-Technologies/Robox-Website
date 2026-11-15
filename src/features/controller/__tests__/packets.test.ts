import { describe, expect, it } from 'vitest'

import vectors from './vectors/controller.json'
import {
    HOST_START,
    HostPacket,
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
        expect(start).toBe(HOST_START)
        expect(Array.from(encodePacket(type, seq, a, b))).toEqual(bytes)
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
