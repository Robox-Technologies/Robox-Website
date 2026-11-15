/**
 * Controller wire format, carried over the Pico's raw mode. Must stay byte-for-byte
 * compatible with the board's controller loop; `__tests__/vectors/controller.json` checks it.
 *
 * Host to board only; the board sends nothing back while in controller mode.
 * Every packet is 6 bytes: start, type, seq, a, b, crc8(type..b).
 */

export const PACKET_LENGTH = 6

export const HOST_START = 0xa5

export const HostPacket = {
    /** a/b: left/right speed, int8 -100..100. Doubles as the heartbeat. */
    DRIVE: 0x01,
    /** Stop the motors and return to the framed protocol. */
    EXIT: 0x04,
} as const

/** 0x10-0x1F are reserved for future outputs (servos, LEDs): a = output id, b = value. */
export const AUX_RANGE = { first: 0x10, last: 0x1f } as const

/** Framed COMMAND that switches the board into its controller loop. */
export const CONTROLLER_MODE_COMMAND = 'controller_mode'
/** Framed reply type the board sends once it has switched; raw packets follow it. */
export const CONTROLLER_MODE_REPLY = 'controller_mode'

export const MAX_SPEED = 100

// === timing (ms) ===

/** Fastest DRIVE rate: 50 Hz. */
export const MIN_SEND_INTERVAL_MS = 20
/** Unchanged DRIVE is re-sent this often, so the board doesn't time out. */
export const HEARTBEAT_MS = 100
/** The board zeroes its motors and leaves controller mode after this long without a valid packet. */
export const CONTROLLER_TIMEOUT_MS = 500

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
): Uint8Array {
    const body = [type & 0xff, seq & 0xff, a & 0xff, b & 0xff]
    return new Uint8Array([HOST_START, ...body, crc8(body)])
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
