/**
 * Controller wire format, carried over the Pico's raw mode. Must stay byte-for-byte
 * compatible with the board's controller loop; `__tests__/vectors/controller.json` checks it.
 *
 * Every packet is 6 bytes: start, type, seq, a, b, crc8(type..b).
 */

export const PACKET_LENGTH = 6

export const HOST_START = 0xa5
export const BOARD_START = 0x5a

export const HostPacket = {
    /** a/b: left/right speed, int8 -100..100. Doubles as the heartbeat. */
    DRIVE: 0x01,
    STOP: 0x02,
    /** Answered with PONG echoing seq. Used for the handshake and round-trip time. */
    PING: 0x03,
    /** Stop the motors and return to the framed protocol. */
    EXIT: 0x04,
} as const

/** 0x10-0x1F are reserved for future outputs (servos, LEDs): a = output id, b = value. */
export const AUX_RANGE = { first: 0x10, last: 0x1f } as const

export const BoardPacket = {
    /** a: echoed PING seq, b: controller protocol version. */
    PONG: 0x81,
    /** a: valid packets received (mod 256), b: StatusFlag bits. */
    STATUS: 0x82,
} as const

export const StatusFlag = {
    WATCHDOG_TRIPPED: 0x01,
    MOTORS_ACTIVE: 0x02,
} as const

export const CONTROLLER_PROTOCOL_VERSION = 1

/** Framed COMMAND that switches the board into its controller loop. */
export const CONTROLLER_MODE_COMMAND = 'controller_mode'

/** Placeholder until the board side ships: the first firmware with a controller loop. */
export const MINIMUM_CONTROLLER_FIRMWARE = '2.3.0'

export const MAX_SPEED = 100

// === timing (ms) ===

/** Fastest DRIVE rate: 50 Hz. */
export const MIN_SEND_INTERVAL_MS = 20
/** Unchanged DRIVE is re-sent this often, so the board's watchdog stays fed. */
export const HEARTBEAT_MS = 100
/** The board stops its motors after this long without a valid packet. */
export const BOARD_WATCHDOG_MS = 300
export const HANDSHAKE_PING_INTERVAL_MS = 150
export const HANDSHAKE_TIMEOUT_MS = 1500
export const PING_INTERVAL_MS = 1000
/** Nothing heard from the board for this long marks the link unresponsive. */
export const LINK_TIMEOUT_MS = 1000

// === CRC-8 (poly 0x07, init 0x00, no reflection) ===

let crcTable: Uint8Array | null = null

function table(): Uint8Array {
    if (crcTable) return crcTable

    const built = new Uint8Array(256)
    for (let index = 0; index < 256; index += 1) {
        let value = index
        for (let bit = 0; bit < 8; bit += 1) {
            value =
                value & 0x80
                    ? ((value << 1) ^ 0x07) & 0xff
                    : (value << 1) & 0xff
        }
        built[index] = value
    }
    crcTable = built
    return built
}

export function crc8(data: ArrayLike<number>): number {
    const lookup = table()
    let crc = 0
    for (let index = 0; index < data.length; index += 1) {
        crc = lookup[(crc ^ data[index]) & 0xff]
    }
    return crc
}

// === encoding ===

/** Two's-complement byte for a signed speed, clamped and rounded. */
export function speedByte(speed: number): number {
    const clamped = Math.max(-MAX_SPEED, Math.min(MAX_SPEED, Math.round(speed)))
    return clamped & 0xff
}

export function signedByte(value: number): number {
    return value & 0x80 ? value - 0x100 : value
}

export function encodePacket(
    type: number,
    seq: number,
    a = 0,
    b = 0,
    start = HOST_START,
): Uint8Array {
    const body = [type & 0xff, seq & 0xff, a & 0xff, b & 0xff]
    return new Uint8Array([start, ...body, crc8(body)])
}

export function encodeDrive(
    seq: number,
    left: number,
    right: number,
): Uint8Array {
    return encodePacket(
        HostPacket.DRIVE,
        seq,
        speedByte(left),
        speedByte(right),
    )
}

// === decoding ===

export interface Packet {
    type: number
    seq: number
    a: number
    b: number
}

/**
 * Pulls packets with the given start byte out of a byte stream. Anything else is
 * skipped a byte at a time, so it resyncs after noise, a framed reply, or a cut-off packet.
 */
export class PacketReader {
    private buffer = new Uint8Array(0)

    /** Bytes thrown away while resyncing. */
    discarded = 0

    constructor(private readonly start = BOARD_START) {}

    feed(data: Uint8Array): Packet[] {
        const joined = new Uint8Array(this.buffer.length + data.length)
        joined.set(this.buffer)
        joined.set(data, this.buffer.length)

        const packets: Packet[] = []
        let offset = 0

        while (offset < joined.length) {
            if (joined[offset] !== this.start) {
                offset += 1
                this.discarded += 1
                continue
            }
            if (joined.length - offset < PACKET_LENGTH) break

            const body = joined.subarray(offset + 1, offset + 5)
            if (crc8(body) !== joined[offset + 5]) {
                offset += 1
                this.discarded += 1
                continue
            }

            packets.push({
                type: body[0],
                seq: body[1],
                a: body[2],
                b: body[3],
            })
            offset += PACKET_LENGTH
        }

        this.buffer = joined.slice(offset)
        return packets
    }

    reset(): void {
        this.buffer = new Uint8Array(0)
    }
}
