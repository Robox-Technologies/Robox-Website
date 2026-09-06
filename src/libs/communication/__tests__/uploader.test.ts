/** End-to-end framed upload against a mock board mirroring src/framed.py. */

import { describe, expect, it } from 'vitest'

import type { Frame } from '../frames'
import {
    FrameReader,
    Kind,
    crc32,
    encodeFlow,
    encodeFrame,
    frameText,
    normaliseProgram,
    programChecksum,
    sequenceDistance,
} from '../frames'
import { Pico } from '../communicate'
import { BaseTransport } from '../transportBase'
import { uploadProgram } from '../uploader'

const encoder = new TextEncoder()

interface MockOptions {
    /** Fraction of 20-byte chunks to drop, imitating BLE packet loss. */
    dropRate?: number
    seed?: number
    /** Corrupt the verdict so the upload must be refused. */
    lieAboutSuccess?: boolean
    /** Send no verdict at all. */
    silent?: boolean
}

/** A transport wired to a mock board, looping replies back through `ingest`. */
class MockTransport extends BaseTransport {
    private reader = new FrameReader()
    private expected = 0
    private discarding = false
    private sinceAck = 0
    private boardOutSeq = 0
    private partial: Uint8Array[] = []
    private runningCrc = 0
    private storedLines: string[] = []
    private expectedLines = 0
    private next: () => number

    stored = ''
    dropped = 0

    constructor(
        pico: Pico,
        private options: MockOptions = {},
    ) {
        super(pico)
        let state = (options.seed ?? 1) >>> 0
        this.next = () => {
            state = (state * 1664525 + 1013904223) >>> 0
            return state / 0x100000000
        }
    }

    protected async sendRaw(data: Uint8Array): Promise<void> {
        // Drop whole chunks, since that is how a BLE write goes missing.
        const kept: number[] = []
        for (let offset = 0; offset < data.length; offset += 20) {
            const chunk = data.subarray(offset, offset + 20)
            if (this.options.dropRate && this.next() < this.options.dropRate) {
                this.dropped += 1
                continue
            }
            kept.push(...chunk)
        }
        this.receive(new Uint8Array(kept))
    }

    /** The board's receive loop. */
    private receive(data: Uint8Array): void {
        const { frames, damage } = this.reader.feed(data)
        if (damage) this.discarding = true

        for (const frame of frames) {
            // BEGIN and COMMAND are resync points: mirrors framed.py.
            if (frame.kind === Kind.BEGIN || frame.kind === Kind.COMMAND) {
                this.expected = frame.seq
                this.discarding = false
            }

            if (frame.seq !== this.expected) {
                if (sequenceDistance(this.expected, frame.seq) >= 128) {
                    this.discarding = true
                }
                continue
            }
            this.expected = (this.expected + 1) % 256
            this.sinceAck += 1
            this.discarding = false
            this.apply(frame)
        }

        this.flush()
    }

    private apply(frame: Frame): void {
        if (frame.kind === Kind.BEGIN) {
            const [count] = frameText(frame).split(',')
            this.expectedLines = Number.parseInt(count, 10)
            this.storedLines = []
            this.partial = []
            this.runningCrc = 0
        } else if (frame.kind === Kind.CONTINUE) {
            this.partial.push(frame.payload)
        } else if (frame.kind === Kind.DATA) {
            const merged = [...this.partial, frame.payload]
            const total = merged.reduce((sum, part) => sum + part.length, 0)
            const joined = new Uint8Array(total)
            let offset = 0
            for (const part of merged) {
                joined.set(part, offset)
                offset += part.length
            }
            this.partial = []
            const line = new TextDecoder().decode(joined) + '\n'
            this.storedLines.push(line)
            this.runningCrc = crc32(encoder.encode(line), this.runningCrc)
        } else if (frame.kind === Kind.END) {
            this.stored = this.storedLines.join('')
            const declared = Number.parseInt(frameText(frame), 16)
            const ok =
                !this.options.lieAboutSuccess &&
                this.storedLines.length === this.expectedLines &&
                this.runningCrc === declared

            if (this.options.silent) return

            const crc = (this.options.lieAboutSuccess ? 0 : this.runningCrc)
                .toString(16)
                .padStart(8, '0')
            this.reply(
                `{"type":"uploaded","message":{"ok":${ok},"lines":${this.storedLines.length},` +
                    `"expected":${this.expectedLines},"crc":"${crc}","want":"${declared
                        .toString(16)
                        .padStart(8, '0')}"}}`,
            )
        }
    }

    private flush(): void {
        if (this.discarding) {
            this.send(
                encodeFlow(this.boardOutSeq++, Kind.NAK, this.expected, 2048),
            )
        } else if (this.sinceAck) {
            this.sinceAck = 0
            this.send(
                encodeFlow(this.boardOutSeq++, Kind.ACK, this.expected, 2048),
            )
        }
    }

    private reply(json: string): void {
        this.send(encodeFrame(this.boardOutSeq++, Kind.REPLY, json))
    }

    /** Loop a board frame back through the real receive path. */
    private send(frame: Uint8Array): void {
        this.ingest(new TextDecoder().decode(frame))
    }

    // Unused by these tests, but the interface requires them.
    async request(): Promise<void> {}
    async connect(): Promise<void> {}
    async disconnect(): Promise<void> {}
    read(): void {}
}

const program = [
    '# upload test',
    ...Array.from({ length: 40 }, (_, i) => `value_${i} = ${i * 3}`),
    "print('done')",
].join('\n')

function build(options: MockOptions = {}) {
    const pico = new Pico()
    return new MockTransport(pico, options)
}

describe('uploadProgram', () => {
    it('verifies a clean upload and stores it byte-exact', async () => {
        const transport = build()
        const result = await uploadProgram(transport, program)

        expect(result.verified).toBe(true)
        expect(result.lines).toBe(result.expectedLines)
        expect(result.checksum).toBe(result.expectedChecksum)
        expect(transport.stored).toBe(normaliseProgram(program))
    })

    it('agrees with the board on the checksum', async () => {
        const transport = build()
        const result = await uploadProgram(transport, program)
        expect(result.expectedChecksum).toBe(
            programChecksum(program).toString(16).padStart(8, '0'),
        )
    })

    it.each([1, 2, 3, 4])(
        'recovers from dropped packets, seed %i',
        async (seed) => {
            const transport = build({ dropRate: 0.15, seed })
            const result = await uploadProgram(transport, program)

            expect(transport.dropped).toBeGreaterThan(0)
            expect(result.verified).toBe(true)
            expect(result.retransmits).toBeGreaterThan(0)
            expect(transport.stored).toBe(normaliseProgram(program))
        },
    )

    it('rejects when the board reports a mismatch', async () => {
        // The behaviour that stops a truncated program being run.
        const transport = build({ lieAboutSuccess: true })
        await expect(uploadProgram(transport, program)).rejects.toThrow(
            /did not arrive intact/,
        )
    })

    it('rejects when the board never confirms', async () => {
        const transport = build({ silent: true })
        await expect(uploadProgram(transport, program)).rejects.toThrow(
            /never confirmed/,
        )
    }, 15000)

    it('stores source that spells a command, rather than acting on it', async () => {
        const risky = [
            "print('before')",
            'x02BEGINUPLD',
            'x03ENDUPLD',
            'x04STARTPROG',
            "print('after')",
        ].join('\n')

        const transport = build({ dropRate: 0.1, seed: 7 })
        const result = await uploadProgram(transport, risky)

        expect(result.verified).toBe(true)
        expect(transport.stored).toBe(normaliseProgram(risky))
        expect(transport.stored).toContain('x04STARTPROG')
    })

    it('verifies two uploads in a row on one connection', async () => {
        // Without BEGIN as a resync point, the second upload's frames all read as
        // stale duplicates and are silently ignored.
        const transport = build()

        const first = await uploadProgram(transport, program)
        expect(first.verified).toBe(true)

        const second = "print('second upload')\nx = 1\n"
        const result = await uploadProgram(transport, second)
        expect(result.verified).toBe(true)
        expect(transport.stored).toBe(normaliseProgram(second))
    })

    it('handles a program of one line', async () => {
        const transport = build()
        const result = await uploadProgram(transport, "print('hi')\n")
        expect(result.verified).toBe(true)
        expect(transport.stored).toBe("print('hi')\n")
    })

    it('handles lines longer than one frame', async () => {
        const long = `x = '${'y'.repeat(400)}'`
        const transport = build()
        const result = await uploadProgram(transport, long)
        expect(result.verified).toBe(true)
        expect(transport.stored).toBe(normaliseProgram(long))
    })
})

describe('Pico.runCode gating', () => {
    it('refuses to run before a verified upload', () => {
        const pico = new Pico()
        const errors: string[] = []
        pico.on('error', ({ message }) => errors.push(message))

        pico.runCode()

        expect(errors).toHaveLength(1)
        expect(errors[0]).toMatch(/not been sent/)
    })
})
