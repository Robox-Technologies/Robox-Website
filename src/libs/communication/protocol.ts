import type { PicoMessageType } from 'src/types/communication'
import type { PaletteColorName } from '@/data/colorPalette'

/** The Ro/Box wire protocol. Must stay in step with `src/main.py` / `src/protocol.py` in Robox-pythonLibs. */

/** Commands the board acts on, carried by name inside a COMMAND frame. */
export const COMMANDS = {
    FIRMWARE_CHECK: 'firmware_check',
    START_PROGRAM: 'start_program',
    COLOR_MODE: 'color_mode',
    RESTART: 'reset_device',
    BOOTLOADER: 'boot_loader',
    DISCONNECT: 'disconnect_device',
} as const

/** One argument-less COMMAND per calibratable colour; the protocol has no parameterised payload. */
export const CALIBRATE_COLOR_COMMANDS: Record<PaletteColorName, string> = {
    red: 'calibrate_color_red',
    orange: 'calibrate_color_orange',
    yellow: 'calibrate_color_yellow',
    green: 'calibrate_color_green',
    blue: 'calibrate_color_blue',
    purple: 'calibrate_color_purple',
    black: 'calibrate_color_black',
    white: 'calibrate_color_white',
}

/** Sibling to `CALIBRATE_COLOR_COMMANDS`, clearing one colour back to its default. */
export const RESET_COLOR_COMMANDS: Record<PaletteColorName, string> = {
    red: 'reset_color_red',
    orange: 'reset_color_orange',
    yellow: 'reset_color_yellow',
    green: 'reset_color_green',
    blue: 'reset_color_blue',
    purple: 'reset_color_purple',
    black: 'reset_color_black',
    white: 'reset_color_white',
}

/** Message types the board can send. Anything else is discarded as noise. */
export const MESSAGE_TYPES: readonly PicoMessageType[] = [
    'console',
    'download',
    'error',
    'firmware',
    'connect',
    'calibrated',
    'uploaded',
    'color',
]

/** Minimum firmware this build can talk to. 2.0.0 removed the unframed protocol; no fallback. */
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

// Chunk size and pacing live in frames.ts, next to the AdaptivePacer.
