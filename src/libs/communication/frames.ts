/**
 * Frame encoding for the Ro/Box link, mirroring src/protocol.py in the
 * firmware repo.
 *
 * Both ends must agree byte for byte. The conformance vectors in
 * `__tests__/vectors/frames.json` are generated from the Python side and
 * asserted against here, so drift fails a test rather than a board.
 *
 * Control and data are told apart by the frame's `kind`, never by inspecting
 * payload bytes. That is what stops a line of user code spelling a command
 * from being executed instead of stored.
 */

export const SOH = 0x01
export const LF = 0x0a

/** SOH + seq(2) + len(2) + crc(4) + kind(1) + ':' */
export const HEADER_LENGTH = 11
export const FRAME_OVERHEAD = HEADER_LENGTH + 1

/** Six BLE chunks including overhead. */
export const MAX_PAYLOAD = 108

export const SEQUENCE_MODULO = 256

export const Kind = {
    DATA: 'D',
    CONTINUE: 'C',
    BEGIN: 'B',
    END: 'E',
    COMMAND: 'X',
    ACK: 'A',
    NAK: 'N',
    REPLY: 'R',
} as const

export type FrameKind = (typeof Kind)[keyof typeof Kind]

export const DATA_KINDS: readonly string[] = [Kind.DATA, Kind.CONTINUE]

/** Acknowledge after this many accepted frames. The amortisation factor. */
export const ACK_EVERY = 8

/** Half the board's UART receive buffer, so a full window cannot overflow it. */
export const DEFAULT_CREDIT = 2048

/** What the sender assumes before the first ACK. */
export const INITIAL_CREDIT = 512

export class ProtocolError extends Error {}

// === CRC-32 ===

/**
 * Standard CRC-32 table, matching Python's binascii.crc32.
 *
 * Built once on first use rather than inlined as a literal: 256 entries of
 * hand-copied hex is a place for a typo to hide, and the vectors would only
 * catch it after the fact.
 */
let crcTable: Uint32Array | null = null

function table(): Uint32Array {
    if (crcTable) return crcTable

    const built = new Uint32Array(256)
    for (let index = 0; index < 256; index += 1) {
        let value = index
        for (let bit = 0; bit < 8; bit += 1) {
            value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1
        }
        built[index] = value >>> 0
    }
    crcTable = built
    return built
}

export function crc32(data: Uint8Array, seed = 0): number {
    const lookup = table()
    let crc = (seed ^ 0xffffffff) >>> 0
    for (let index = 0; index < data.length; index += 1) {
        crc = (lookup[(crc ^ data[index]) & 0xff] ^ (crc >>> 8)) >>> 0
    }
    return (crc ^ 0xffffffff) >>> 0
}

const encoder = new TextEncoder()
const decoder = new TextDecoder()

/**
 * Check over the header fields and payload.
 *
 * Covers seq and kind too: a corrupted header misroutes a frame, which a
 * payload-only checksum would not notice.
 */
export function frameChecksum(
    seq: number,
    kind: string,
    payload: Uint8Array,
): number {
    const buffer = new Uint8Array(3 + payload.length)
    buffer[0] = seq & 0xff
    buffer[1] = payload.length
    buffer[2] = kind.charCodeAt(0)
    buffer.set(payload, 3)
    return crc32(buffer) & 0xffff
}

// === program normalisation ===

/**
 * Canonical form both ends checksum.
 *
 * Line endings collapse to \n and exactly one trailing newline is guaranteed;
 * nothing else changes. Blank lines are preserved: the old protocol dropped
 * them because an empty line was indistinguishable from noise on the UART, but
 * a frame states its payload length, so an empty line is now explicit and the
 * stored program can be a faithful copy of what was written.
 */
export function normaliseProgram(text: string): string {
    const unified = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n')
    if (!unified) return ''

    const lines = unified.split('\n')
    // split() leaves a trailing empty element when the text ended in a
    // newline; that is not a blank line of its own.
    if (lines[lines.length - 1] === '') lines.pop()
    if (!lines.length) return ''

    return lines.map((line) => line + '\n').join('')
}

export function programChecksum(text: string): number {
    return crc32(encoder.encode(normaliseProgram(text))) >>> 0
}

export function programLineCount(text: string): number {
    const normalised = normaliseProgram(text)
    let count = 0
    for (const char of normalised) if (char === '\n') count += 1
    return count
}

// === encoding ===

function hex(value: number, width: number): string {
    return value.toString(16).padStart(width, '0')
}

export function frameLength(payloadLength: number): number {
    return FRAME_OVERHEAD + payloadLength
}

export function encodeFrame(
    seq: number,
    kind: string,
    payload: Uint8Array | string = new Uint8Array(0),
): Uint8Array {
    const bytes =
        typeof payload === 'string' ? encoder.encode(payload) : payload

    if (bytes.length > MAX_PAYLOAD) {
        throw new ProtocolError(
            `payload of ${bytes.length} exceeds MAX_PAYLOAD ${MAX_PAYLOAD}`,
        )
    }
    if (bytes.includes(SOH) || bytes.includes(LF)) {
        throw new ProtocolError('payload may not contain SOH or LF')
    }
    if (kind.length !== 1) {
        throw new ProtocolError('kind must be a single character')
    }

    const header = `${String.fromCharCode(SOH)}${hex(seq & 0xff, 2)}${hex(
        bytes.length,
        2,
    )}${hex(frameChecksum(seq, kind, bytes), 4)}${kind}:`

    const headerBytes = encoder.encode(header)
    const frame = new Uint8Array(headerBytes.length + bytes.length + 1)
    frame.set(headerBytes, 0)
    frame.set(bytes, headerBytes.length)
    frame[frame.length - 1] = LF
    return frame
}

export interface Piece {
    kind: string
    payload: Uint8Array
}

/**
 * Break text into frame-sized payloads.
 *
 * Splits on encoded bytes but never inside a multi-byte character, which would
 * decode to a replacement character and corrupt the result. All but the last
 * piece are CONTINUE, so CONTINUE means only "the payload continues in the
 * next frame" and works either direction: program text ends in DATA, a device
 * message ends in REPLY.
 */
export function splitPayload(
    text: string,
    finalKind: string,
    limit = MAX_PAYLOAD,
): Piece[] {
    const encoded = encoder.encode(text)
    if (encoded.length <= limit) {
        return [{ kind: finalKind, payload: encoded }]
    }

    const pieces: Uint8Array[] = []
    let offset = 0
    while (offset < encoded.length) {
        let end = Math.min(offset + limit, encoded.length)
        // Walk back off a continuation byte (10xxxxxx).
        while (
            end > offset + 1 &&
            end < encoded.length &&
            (encoded[end] & 0xc0) === 0x80
        ) {
            end -= 1
        }
        pieces.push(encoded.subarray(offset, end))
        offset = end
    }

    return pieces.map((payload, index) => ({
        kind: index === pieces.length - 1 ? finalKind : Kind.CONTINUE,
        payload,
    }))
}

/** Break one source line into frame-sized payloads, ending in DATA. */
export function splitLine(line: string, limit = MAX_PAYLOAD): Piece[] {
    return splitPayload(line, Kind.DATA, limit)
}

/**
 * Frames for a whole upload: BEGIN, body, END.
 *
 * BEGIN and END carry the line count and program CRC, so the receiver can
 * verify the result independently of individual frame delivery.
 */
export function encodeProgram(text: string, startSeq = 0): Uint8Array[] {
    const normalised = normaliseProgram(text)
    const lines = normalised.length ? normalised.split('\n').slice(0, -1) : []
    const checksum = programChecksum(text)

    const frames: Uint8Array[] = []
    let seq = startSeq & 0xff

    const add = (kind: string, payload: Uint8Array | string) => {
        frames.push(encodeFrame(seq, kind, payload))
        seq = (seq + 1) % SEQUENCE_MODULO
    }

    add(Kind.BEGIN, `${lines.length},${hex(checksum, 8)}`)
    for (const line of lines) {
        for (const piece of splitLine(line)) {
            add(piece.kind, piece.payload)
        }
    }
    add(Kind.END, hex(checksum, 8))

    return frames
}

export function encodeFlow(
    seq: number,
    kind: string,
    expectedSeq: number,
    credit: number,
): Uint8Array {
    return encodeFrame(
        seq,
        kind,
        `${hex(expectedSeq & 0xff, 2)},${hex(credit, 4)}`,
    )
}

export function parseBegin(payload: Uint8Array): {
    lineCount: number
    checksum: number
} {
    const [count, checksum] = decoder.decode(payload).split(',')
    return { lineCount: parseInt(count, 10), checksum: parseInt(checksum, 16) }
}

export function parseEnd(payload: Uint8Array): number {
    return parseInt(decoder.decode(payload), 16)
}

export function parseFlow(payload: Uint8Array): {
    expectedSeq: number
    credit: number
} {
    const [expected, credit] = decoder.decode(payload).split(',')
    return {
        expectedSeq: parseInt(expected, 16),
        credit: parseInt(credit, 16),
    }
}

// === decoding ===

export interface Frame {
    seq: number
    kind: string
    payload: Uint8Array
}

export function frameText(frame: Frame): string {
    return decoder.decode(frame.payload)
}

/**
 * Pulls frames from a stream that may be missing pieces.
 *
 * `feed` returns the frames it recovered and how many were damaged. Damage is
 * reported rather than swallowed: "we lost something" is the signal the old
 * protocol never had.
 */
export class FrameReader {
    private buffer: Uint8Array = new Uint8Array(0)

    damaged = 0
    resyncs = 0

    constructor(private maxBuffer = 4096) {}

    feed(data: Uint8Array): { frames: Frame[]; damage: number } {
        if (data.length) {
            const merged = new Uint8Array(this.buffer.length + data.length)
            merged.set(this.buffer, 0)
            merged.set(data, this.buffer.length)
            this.buffer = merged
        }

        // Accumulating garbage rather than frames; drop to the newest SOH so a
        // corrupt run cannot pin the buffer for the rest of the session.
        if (this.buffer.length > this.maxBuffer) {
            const last = this.buffer.lastIndexOf(SOH)
            this.buffer = this.buffer.subarray(
                last > 0 ? last : this.buffer.length,
            )
            this.resyncs += 1
        }

        const frames: Frame[] = []
        let damage = 0

        for (;;) {
            const start = this.buffer.indexOf(SOH)
            if (start === -1) {
                this.buffer = new Uint8Array(0)
                break
            }
            if (start > 0) {
                // Debris from a lost frame.
                this.buffer = this.buffer.subarray(start)
            }

            if (this.buffer.length < HEADER_LENGTH) break

            const seq = parseHex(this.buffer, 1, 2)
            const length = parseHex(this.buffer, 3, 2)
            const checksum = parseHex(this.buffer, 5, 4)

            if (seq === -1 || length === -1 || checksum === -1) {
                damage += 1
                this.resync()
                continue
            }

            const kind = String.fromCharCode(this.buffer[9])
            if (this.buffer[10] !== 0x3a || length > MAX_PAYLOAD) {
                damage += 1
                this.resync()
                continue
            }

            const total = HEADER_LENGTH + length + 1
            if (this.buffer.length < total) {
                // Still arriving, or truncated by a lost packet. A later SOH
                // proves the latter, since payloads cannot contain one.
                if (this.buffer.subarray(1).indexOf(SOH) !== -1) {
                    damage += 1
                    this.resync()
                    continue
                }
                break
            }

            if (this.buffer[total - 1] !== LF) {
                damage += 1
                this.resync()
                continue
            }

            const payload = this.buffer.slice(HEADER_LENGTH, total - 1)
            if (frameChecksum(seq, kind, payload) !== checksum) {
                damage += 1
                this.resync()
                continue
            }

            frames.push({ seq, kind, payload })
            this.buffer = this.buffer.subarray(total)
        }

        this.damaged += damage
        return { frames, damage }
    }

    /** Skip this sentinel, hunt for the next. */
    private resync(): void {
        const next = this.buffer.subarray(1).indexOf(SOH)
        this.buffer =
            next === -1 ? new Uint8Array(0) : this.buffer.subarray(next + 1)
        this.resyncs += 1
    }
}

/** Parse `width` ASCII hex digits, or -1 if they are not hex. */
function parseHex(data: Uint8Array, offset: number, width: number): number {
    let value = 0
    for (let index = offset; index < offset + width; index += 1) {
        const byte = data[index]
        let digit: number
        if (byte >= 0x30 && byte <= 0x39) digit = byte - 0x30
        else if (byte >= 0x61 && byte <= 0x66) digit = byte - 0x61 + 10
        else if (byte >= 0x41 && byte <= 0x46) digit = byte - 0x41 + 10
        else return -1
        value = value * 16 + digit
    }
    return value
}

// === sender-side flow control ===

/** Forward distance, accounting for wraparound. */
export function sequenceDistance(later: number, earlier: number): number {
    return (
        (((later - earlier) % SEQUENCE_MODULO) + SEQUENCE_MODULO) %
        SEQUENCE_MODULO
    )
}

/**
 * Credit window with go-back-N retransmission.
 *
 * Mirrors CreditWindow in src/protocol.py so both implementations can be tested
 * against the same expectations.
 */
export class CreditWindow {
    private base = 0
    private nextIndex = 0

    retransmits = 0

    constructor(
        private frames: Uint8Array[],
        private startSeq = 0,
        public credit = INITIAL_CREDIT,
    ) {
        this.startSeq = startSeq % SEQUENCE_MODULO
    }

    private indexForSeq(seq: number): number {
        return sequenceDistance(seq, this.startSeq)
    }

    inFlightBytes(): number {
        let total = 0
        for (let i = this.base; i < this.nextIndex; i += 1) {
            total += this.frames[i].length
        }
        return total
    }

    /** Frames that may go out now without exceeding the credit. */
    ready(): Uint8Array[] {
        const out: Uint8Array[] = []
        let budget = this.credit - this.inFlightBytes()
        let index = this.nextIndex
        while (
            index < this.frames.length &&
            this.frames[index].length <= budget
        ) {
            out.push(this.frames[index])
            budget -= this.frames[index].length
            index += 1
        }
        return out
    }

    advance(count: number): void {
        this.nextIndex = Math.min(this.frames.length, this.nextIndex + count)
    }

    onAck(expectedSeq: number, credit: number): void {
        if (credit) this.credit = credit
        const index = this.indexForSeq(expectedSeq)
        if (index > this.base) this.base = Math.min(index, this.frames.length)
        if (this.nextIndex < this.base) this.nextIndex = this.base
    }

    /** Rewind so transmission resumes where the receiver wants. */
    onNak(expectedSeq: number): boolean {
        const index = this.indexForSeq(expectedSeq)
        if (index >= this.frames.length) return false

        // Only ever rewind: a duplicate NAK for a gap already being resent must
        // not drag the window back twice.
        if (index < this.nextIndex) {
            this.nextIndex = index
            this.base = Math.min(this.base, index)
            this.retransmits += 1
            return true
        }
        return false
    }

    /** Resend from the oldest unacknowledged frame. The timeout path. */
    rewindToBase(): void {
        if (this.nextIndex > this.base) {
            this.nextIndex = this.base
            this.retransmits += 1
        }
    }

    complete(): boolean {
        return this.base >= this.frames.length
    }

    get total(): number {
        return this.frames.length
    }
}
