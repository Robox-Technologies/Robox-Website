/** Frame encoding, including conformance against vectors from the firmware's tools/gen_vectors.py. */

import { describe, expect, it } from 'vitest'

import vectors from './vectors/frames.json'
import {
    ACK_EVERY,
    AdaptivePacer,
    BLE_CHUNK_SIZE,
    MAX_CHUNK_DELAY_MS,
    MIN_CHUNK_DELAY_MS,
    START_CHUNK_DELAY_MS,
    UART_BYTES_PER_SECOND,
    CreditWindow,
    DEFAULT_CREDIT,
    FRAME_OVERHEAD,
    FrameReader,
    HEADER_LENGTH,
    INITIAL_CREDIT,
    Kind,
    LF,
    MAX_PAYLOAD,
    ProtocolError,
    SEQUENCE_MODULO,
    SOH,
    crc32,
    encodeFlow,
    encodeFrame,
    encodeProgram,
    frameChecksum,
    frameText,
    normaliseProgram,
    parseBegin,
    parseEnd,
    parseFlow,
    programChecksum,
    programLineCount,
    sequenceDistance,
    splitLine,
} from '../frames'

const encoder = new TextEncoder()

function toHex(bytes: Uint8Array): string {
    return Array.from(bytes)
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')
}

function concat(chunks: Uint8Array[]): Uint8Array {
    const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
    const out = new Uint8Array(total)
    let offset = 0
    for (const chunk of chunks) {
        out.set(chunk, offset)
        offset += chunk.length
    }
    return out
}

describe('conformance with the firmware', () => {
    it('agrees on the wire constants', () => {
        const c = vectors.constants
        expect(SOH).toBe(c.SOH)
        expect(LF).toBe(c.LF)
        expect(HEADER_LENGTH).toBe(c.HEADER_LENGTH)
        expect(FRAME_OVERHEAD).toBe(c.FRAME_OVERHEAD)
        expect(MAX_PAYLOAD).toBe(c.MAX_PAYLOAD)
        expect(SEQUENCE_MODULO).toBe(c.SEQUENCE_MODULO)
        expect(ACK_EVERY).toBe(c.ACK_EVERY)
        expect(DEFAULT_CREDIT).toBe(c.DEFAULT_CREDIT)
        expect(INITIAL_CREDIT).toBe(c.INITIAL_CREDIT)
        expect(Kind).toEqual(c.kinds)
    })

    it.each(vectors.checksums)(
        'checksums seq=$seq kind=$kind identically',
        ({ seq, kind, payload, checksum, frame }) => {
            const bytes = encoder.encode(payload)
            expect(
                frameChecksum(seq, kind, bytes).toString(16).padStart(4, '0'),
            ).toBe(checksum)
            expect(toHex(encodeFrame(seq, kind, payload))).toBe(frame)
        },
    )

    it.each(vectors.programs)(
        'normalises and checksums $name identically',
        ({ source, normalised, lineCount, checksum, frames }) => {
            expect(normaliseProgram(source)).toBe(normalised)
            expect(programLineCount(source)).toBe(lineCount)
            expect(programChecksum(source).toString(16).padStart(8, '0')).toBe(
                checksum,
            )
            expect(encodeProgram(source).map(toHex)).toEqual(frames)
        },
    )

    it.each(vectors.splits)('splits a line identically', ({ line, pieces }) => {
        expect(
            splitLine(line).map((piece) => ({
                kind: piece.kind,
                payload: toHex(piece.payload),
            })),
        ).toEqual(pieces)
    })
})

describe('crc32', () => {
    it('matches the known check value', () => {
        // The standard CRC-32 check vector: "123456789" -> 0xcbf43926.
        expect(crc32(encoder.encode('123456789'))).toBe(0xcbf43926)
    })

    it('is empty-safe', () => {
        expect(crc32(new Uint8Array(0))).toBe(0)
    })
})

describe('encodeFrame', () => {
    it('round-trips through the reader', () => {
        const { frames, damage } = new FrameReader().feed(
            encodeFrame(0x2a, Kind.DATA, "print('hi')"),
        )
        expect(damage).toBe(0)
        expect(frames).toHaveLength(1)
        expect(frames[0].seq).toBe(0x2a)
        expect(frameText(frames[0])).toBe("print('hi')")
    })

    it('uses a fixed-width header', () => {
        for (const size of [0, 1, MAX_PAYLOAD]) {
            const frame = encodeFrame(
                0,
                Kind.DATA,
                new Uint8Array(size).fill(0x78),
            )
            expect(frame.length).toBe(FRAME_OVERHEAD + size)
            expect(frame[0]).toBe(SOH)
            expect(frame[frame.length - 1]).toBe(LF)
            expect(frame[10]).toBe(0x3a)
        }
    })

    it('refuses payloads containing the sentinels', () => {
        expect(() =>
            encodeFrame(0, Kind.DATA, new Uint8Array([0x61, SOH])),
        ).toThrow(ProtocolError)
        expect(() => encodeFrame(0, Kind.DATA, 'a\nb')).toThrow(ProtocolError)
    })

    it('refuses oversized payloads', () => {
        expect(() =>
            encodeFrame(0, Kind.DATA, new Uint8Array(MAX_PAYLOAD + 1)),
        ).toThrow(ProtocolError)
    })

    it('wraps the sequence number', () => {
        const { frames } = new FrameReader().feed(
            encodeFrame(300, Kind.DATA, ''),
        )
        expect(frames[0].seq).toBe(300 % 256)
    })
})

describe('splitLine', () => {
    it('never splits inside a multi-byte character', () => {
        const line = '# ' + 'é'.repeat(200)
        const pieces = splitLine(line)
        expect(
            new TextDecoder().decode(concat(pieces.map((p) => p.payload))),
        ).toBe(line)
        // A split mid-codepoint would produce a replacement character here.
        for (const piece of pieces) {
            expect(
                new TextDecoder('utf-8', { fatal: true }).decode(piece.payload),
            ).toBeTypeOf('string')
        }
        expect(pieces[pieces.length - 1].kind).toBe(Kind.DATA)
        expect(pieces.slice(0, -1).every((p) => p.kind === Kind.CONTINUE)).toBe(
            true,
        )
    })

    it('handles four-byte characters', () => {
        const line = '\u{1f916}'.repeat(60)
        const pieces = splitLine(line)
        expect(
            new TextDecoder().decode(concat(pieces.map((p) => p.payload))),
        ).toBe(line)
    })
})

describe('encodeProgram', () => {
    it('brackets the body with BEGIN and END', () => {
        const { frames } = new FrameReader().feed(
            concat(encodeProgram('a = 1\nb = 2\n')),
        )
        expect(frames.map((f) => f.kind)).toEqual([
            Kind.BEGIN,
            Kind.DATA,
            Kind.DATA,
            Kind.END,
        ])
        expect(frames.map((f) => f.seq)).toEqual([0, 1, 2, 3])

        const begin = parseBegin(frames[0].payload)
        expect(begin.lineCount).toBe(2)
        expect(begin.checksum).toBe(programChecksum('a = 1\nb = 2\n'))
        expect(parseEnd(frames[3].payload)).toBe(begin.checksum)
    })

    it('keeps command text as data', () => {
        // The defect this protocol exists to remove.
        const { frames } = new FrameReader().feed(
            concat(encodeProgram('x03ENDUPLD\nafter = 1\n')),
        )
        const body = frames.filter((f) => f.kind === Kind.DATA)
        expect(body.map(frameText)).toEqual(['x03ENDUPLD', 'after = 1'])
    })
})

describe('flow frames', () => {
    it('round-trips an ACK', () => {
        const { frames } = new FrameReader().feed(
            encodeFlow(7, Kind.ACK, 0x2b, 2048),
        )
        expect(frames[0].kind).toBe(Kind.ACK)
        expect(parseFlow(frames[0].payload)).toEqual({
            expectedSeq: 0x2b,
            credit: 2048,
        })
    })
})

describe('FrameReader', () => {
    it('reassembles a frame delivered one byte at a time', () => {
        const reader = new FrameReader()
        const frame = encodeFrame(5, Kind.DATA, 'chunked delivery')
        const out = []
        for (let i = 0; i < frame.length; i += 1) {
            const { frames, damage } = reader.feed(frame.subarray(i, i + 1))
            expect(damage).toBe(0)
            out.push(...frames)
        }
        expect(out).toHaveLength(1)
        expect(frameText(out[0])).toBe('chunked delivery')
    })

    it('skips leading garbage', () => {
        const { frames } = new FrameReader().feed(
            concat([
                encoder.encode('noise'),
                encodeFrame(1, Kind.DATA, 'payload'),
            ]),
        )
        expect(frames).toHaveLength(1)
    })

    it('reports a corrupt checksum instead of delivering it', () => {
        const frame = encodeFrame(1, Kind.DATA, 'payload')
        frame[HEADER_LENGTH] ^= 0xff
        const { frames, damage } = new FrameReader().feed(frame)
        expect(frames).toEqual([])
        expect(damage).toBe(1)
    })

    it('detects truncation once the next frame arrives', () => {
        // A dropped BLE packet truncates a frame; the next SOH proves it.
        const first = encodeFrame(1, Kind.DATA, 'a'.repeat(60))
        const second = encodeFrame(2, Kind.DATA, 'intact')
        const { frames, damage } = new FrameReader().feed(
            concat([first.subarray(0, 30), second]),
        )
        expect(damage).toBe(1)
        expect(frames.map(frameText)).toEqual(['intact'])
    })

    it('does not let an unterminated sentinel run pin the buffer', () => {
        const reader = new FrameReader(256)
        for (let i = 0; i < 200; i += 1) {
            reader.feed(
                concat([new Uint8Array([SOH]), new Uint8Array(40).fill(0x78)]),
            )
        }
        expect(reader.resyncs).toBeGreaterThan(0)
    })

    it('discards a stream with no sentinel', () => {
        const { frames } = new FrameReader().feed(encoder.encode('plain text'))
        expect(frames).toEqual([])
    })
})

describe('sequenceDistance', () => {
    it('handles wraparound', () => {
        expect(sequenceDistance(3, 1)).toBe(2)
        expect(sequenceDistance(1, 254)).toBe(3)
        expect(sequenceDistance(0, 0)).toBe(0)
    })
})

describe('CreditWindow', () => {
    const build = (count: number, payload = 88) =>
        Array.from({ length: count }, (_, i) =>
            encodeFrame(i, Kind.DATA, new Uint8Array(payload).fill(0x78)),
        )

    it('bounds what goes out by the credit', () => {
        const window = new CreditWindow(build(20), 0, 300)
        expect(window.ready()).toHaveLength(3) // 100 bytes each
        window.advance(3)
        expect(window.ready()).toEqual([])
    })

    it('frees the window on an ack', () => {
        const window = new CreditWindow(build(20), 0, 300)
        window.advance(3)
        window.onAck(3, 300)
        expect(window.ready()).toHaveLength(3)
    })

    it('rewinds on a nak', () => {
        const window = new CreditWindow(build(10, 1), 0, 10000)
        window.advance(10)
        expect(window.onNak(4)).toBe(true)
        expect(window.retransmits).toBe(1)
    })

    it('does not rewind twice for a duplicate nak', () => {
        const window = new CreditWindow(build(10, 1), 0, 10000)
        window.advance(10)
        window.onNak(4)
        expect(window.onNak(4)).toBe(false)
        expect(window.retransmits).toBe(1)
    })

    it('completes when everything is acked', () => {
        const window = new CreditWindow(build(5, 1), 0, 10000)
        window.advance(5)
        expect(window.complete()).toBe(false)
        window.onAck(5, 2048)
        expect(window.complete()).toBe(true)
    })
})

describe('recovery over a lossy link', () => {
    /** Seeded PRNG so a failure is reproducible. */
    function rng(seed: number): () => number {
        let state = seed >>> 0
        return () => {
            state = (state * 1664525 + 1013904223) >>> 0
            return state / 0x100000000
        }
    }

    /** Drops whole 20-byte chunks, which is how BLE actually fails. */
    function lossyTransmit(
        data: Uint8Array,
        next: () => number,
        dropRate: number,
    ): { out: Uint8Array; dropped: number } {
        const kept: Uint8Array[] = []
        let dropped = 0
        for (let offset = 0; offset < data.length; offset += 20) {
            const chunk = data.subarray(offset, offset + 20)
            if (next() < dropRate) {
                dropped += 1
                continue
            }
            kept.push(chunk)
        }
        return { out: concat(kept), dropped }
    }

    const program = [
        '# lossy link corpus',
        ...Array.from({ length: 60 }, (_, i) => `value_${i} = ${i * 7}`),
        "print('done')",
    ].join('\n')

    /** Drives both endpoints against each other, mirroring the Python test. */
    function runUpload(dropRate: number, seed: number) {
        const next = rng(seed)
        const window = new CreditWindow(
            encodeProgram(program),
            0,
            INITIAL_CREDIT,
        )
        const reader = new FrameReader()

        let expected = 0
        let discarding = false
        let stored: string[] = []
        let partial: Uint8Array[] = []
        let verified: boolean | null = null
        let totalDropped = 0

        for (let round = 0; round < 500 && !window.complete(); round += 1) {
            let batch = window.ready()
            if (!batch.length) {
                // Nothing may go out, so an ACK was lost. Retransmit from base.
                window.rewindToBase()
                batch = window.ready()
                if (!batch.length) break
            }
            window.advance(batch.length)

            const { out, dropped } = lossyTransmit(
                concat(batch),
                next,
                dropRate,
            )
            totalDropped += dropped

            const { frames, damage } = reader.feed(out)
            if (damage) discarding = true

            for (const frame of frames) {
                if (frame.seq !== expected) {
                    if (
                        sequenceDistance(expected, frame.seq) >=
                        SEQUENCE_MODULO / 2
                    ) {
                        discarding = true
                    }
                    continue
                }
                expected = (expected + 1) % SEQUENCE_MODULO
                discarding = false

                if (frame.kind === Kind.BEGIN) {
                    stored = []
                    partial = []
                } else if (frame.kind === Kind.CONTINUE) {
                    partial.push(frame.payload)
                } else if (frame.kind === Kind.DATA) {
                    stored.push(
                        new TextDecoder().decode(
                            concat([...partial, frame.payload]),
                        ),
                    )
                    partial = []
                } else if (frame.kind === Kind.END) {
                    const text = stored.map((line) => line + '\n').join('')
                    verified =
                        crc32(encoder.encode(text)) === parseEnd(frame.payload)
                }
            }

            if (discarding) {
                window.onNak(expected)
            } else {
                window.onAck(expected, DEFAULT_CREDIT)
            }
        }

        return {
            stored: stored.map((line) => line + '\n').join(''),
            verified,
            dropped: totalDropped,
        }
    }

    it('delivers exactly over a perfect link', () => {
        const result = runUpload(0, 1)
        expect(result.stored).toBe(normaliseProgram(program))
        expect(result.verified).toBe(true)
    })

    it.each([1, 2, 3, 4, 5, 6, 7, 8])(
        'recovers byte-exact from 20%% chunk loss, seed %i',
        (seed) => {
            const result = runUpload(0.2, seed)
            expect(result.dropped).toBeGreaterThan(0)
            expect(result.stored).toBe(normaliseProgram(program))
            expect(result.verified).toBe(true)
        },
    )
})

describe('AdaptivePacer', () => {
    it('derives its floor from the UART drain time', () => {
        // Arithmetic, not a tuning guess: the time the HM-10 needs to forward
        // one chunk to the board.
        const drainMs = (BLE_CHUNK_SIZE * 1000) / UART_BYTES_PER_SECOND
        expect(MIN_CHUNK_DELAY_MS).toBeGreaterThan(drainMs)
        expect(MIN_CHUNK_DELAY_MS).toBeLessThan(drainMs + 2)
    })

    it('probes down to the floor on a clean link and stops', () => {
        const pacer = new AdaptivePacer()
        for (let i = 0; i < 500; i += 1) pacer.onCleanBatch()
        expect(pacer.delayMs).toBe(MIN_CHUNK_DELAY_MS)
    })

    it('never goes below the floor', () => {
        const pacer = new AdaptivePacer(MIN_CHUNK_DELAY_MS)
        for (let i = 0; i < 50; i += 1) {
            pacer.onCleanBatch()
            expect(pacer.delayMs).toBeGreaterThanOrEqual(MIN_CHUNK_DELAY_MS)
        }
    })

    it('requires a streak before probing', () => {
        const pacer = new AdaptivePacer(
            40,
            MIN_CHUNK_DELAY_MS,
            MAX_CHUNK_DELAY_MS,
            3,
        )
        pacer.onCleanBatch()
        pacer.onCleanBatch()
        expect(pacer.delayMs).toBe(40)
        pacer.onCleanBatch()
        expect(pacer.delayMs).toBeLessThan(40)
    })

    it('backs off multiplicatively on loss', () => {
        const pacer = new AdaptivePacer(30)
        pacer.onLoss()
        expect(pacer.delayMs).toBeGreaterThan(30)
        expect(pacer.delayMs).toBeLessThanOrEqual(MAX_CHUNK_DELAY_MS)
    })

    it('resets the clean streak on loss', () => {
        // Otherwise one clean batch after loss would probe straight back down.
        const pacer = new AdaptivePacer(
            40,
            MIN_CHUNK_DELAY_MS,
            MAX_CHUNK_DELAY_MS,
            2,
        )
        pacer.onCleanBatch()
        pacer.onLoss()
        const before = pacer.delayMs
        pacer.onCleanBatch()
        expect(pacer.delayMs).toBe(before)
    })

    it('is capped above', () => {
        const pacer = new AdaptivePacer(MAX_CHUNK_DELAY_MS)
        expect(pacer.onLoss()).toBe(false)
        expect(pacer.delayMs).toBe(MAX_CHUNK_DELAY_MS)
    })

    it.each([24, 28, 34, 45])(
        'converges near a link whose true capacity is %ims',
        (capacity) => {
            // In bursts, because that's what go-back-N produces from one bad patch.
            const pacer = new AdaptivePacer()
            const seen: number[] = []
            for (let i = 0; i < 400; i += 1) {
                if (pacer.delayMs < capacity) {
                    for (let n = 0; n < 6; n += 1) pacer.onLoss()
                } else {
                    pacer.onCleanBatch()
                }
                seen.push(pacer.delayMs)
            }

            const settled = seen.slice(-100)
            expect(Math.min(...settled)).toBeGreaterThanOrEqual(
                MIN_CHUNK_DELAY_MS,
            )
            const average = settled.reduce((a, b) => a + b, 0) / settled.length
            expect(Math.abs(average - capacity)).toBeLessThan(capacity * 0.35)
            // A burst is one episode, so it must not spike far above capacity.
            expect(Math.max(...settled)).toBeLessThanOrEqual(capacity * 1.6)
        },
    )

    it('keeps what it learned for the next upload', () => {
        const pacer = new AdaptivePacer()
        for (let i = 0; i < 20; i += 1) pacer.onCleanBatch()
        const learned = pacer.delayMs
        expect(learned).toBeLessThan(START_CHUNK_DELAY_MS)
        pacer.onCleanBatch()
        expect(pacer.delayMs).toBeLessThanOrEqual(learned)
    })
})
