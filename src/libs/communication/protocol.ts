import type { PicoMessageType } from 'src/types/communication'

/**
 * The single source of truth for the Ro/Box wire protocol.
 *
 * The firmware has its own copy in `src/main.py` and `src/protocol.py`
 * (Robox-pythonLibs). The two must not drift, so anything added here needs a
 * matching branch there and vice versa.
 */

/**
 * Commands the board acts on, carried by name inside a COMMAND frame.
 *
 * The old protocol sent these as bare lines and the firmware compared every
 * received line against the table, so user code that happened to match was
 * executed instead of stored. A more obscure sentinel would not have fixed
 * that: any in-band marker is a string somebody can type into the editor.
 * These names are safe because a frame's kind, not its payload, decides
 * whether it is a command, and program text only ever becomes DATA or
 * CONTINUE frames.
 */
export const COMMANDS = {
    FIRMWARE_CHECK: 'firmware_check',
    START_PROGRAM: 'start_program',
    CALIBRATE_COLOR: 'calibrate_color',
    RESTART: 'reset_device',
    BOOTLOADER: 'boot_loader',
    DISCONNECT: 'disconnect_device',
} as const

/**
 * Message types the board can send. Anything else is discarded as noise.
 *
 * Typed against `PicoMessageType` so adding a type in one place and forgetting
 * the other is a compile error rather than messages silently vanishing.
 */
export const MESSAGE_TYPES: readonly PicoMessageType[] = [
    'console',
    'download',
    'error',
    'firmware',
    'connect',
    'calibrated',
    'uploaded',
]

/**
 * Minimum firmware this build can talk to at all.
 *
 * 2.0.0 removed the unframed protocol. There is deliberately no fallback: an
 * older board cannot be uploaded to, and the user is told to update rather
 * than being quietly handed a path that corrupts programs.
 */
export const MINIMUM_FIRMWARE_VERSION = '2.0.0'

/** Framed protocol version this build speaks. */
export const SUPPORTED_PROTOCOL_VERSION = 2

/**
 * Pull the version and protocol out of a firmware reply like "2.0.0+proto2".
 * A reply with no suffix is pre-2.0.0 firmware, which is protocol 1.
 */
export function parseFirmwareReply(reply: string): {
    version: string
    protocol: number
} {
    const [version, suffix] = reply.split('+proto')
    return {
        version: version || reply,
        protocol: suffix ? Number.parseInt(suffix, 10) || 1 : 1,
    }
}

/** True when `version` is at least `minimum`, compared numerically per part. */
export function meetsMinimumVersion(version: string, minimum: string): boolean {
    const parse = (value: string) =>
        value.split('.').map((part) => Number.parseInt(part, 10) || 0)

    const actual = parse(version)
    const required = parse(minimum)
    const length = Math.max(actual.length, required.length)

    for (let index = 0; index < length; index += 1) {
        const left = actual[index] ?? 0
        const right = required[index] ?? 0
        if (left !== right) return left > right
    }
    return true
}

/** HM-10 UART service and characteristic, shared by both Bluetooth transports. */
export const UART_SERVICE = 0xffe0
export const UART_CHARACTERISTIC = 0xffe1

/**
 * Bytes per write-without-response. 20 is the guaranteed-safe ATT payload for
 * the default 23-byte MTU, which is all the HM-10 negotiates.
 */
export const BLE_CHUNK_SIZE = 20

/**
 * Pacing between chunks, in milliseconds.
 *
 * The credit window bounds how much is in flight relative to the *board's*
 * UART buffer, but the HM-10 in between drains to the board at only 9600 baud
 * (960 B/s) and has a small buffer of its own, so writes still have to be
 * paced or that buffer is what overflows. 20 bytes at 960 B/s is 20.8 ms, so
 * this is roughly 2x conservative; `tools/comm-bench --chunk-delay-ms` in the
 * firmware repo exists to find the real floor on hardware.
 */
export const BLE_WRITE_DELAY_MS = 40
