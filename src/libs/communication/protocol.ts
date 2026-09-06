import type { PicoMessageType } from 'src/types/communication'
import type { PaletteColorName } from '@/data/colorPalette'

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
    COLOR_MODE: 'color_mode',
    RESTART: 'reset_device',
    BOOTLOADER: 'boot_loader',
    DISCONNECT: 'disconnect_device',
    STOP_MOTORS: 'stop_motors',
} as const

/**
 * One argument-less COMMAND per calibratable colour. The protocol's
 * whitelist model has no parameterised payload, so the colour name is baked
 * into the command string itself instead of being sent alongside it.
 *
 * White/black are special on the board - they set the sensor's
 * brightness-extreme scale that every other colour's reading passes
 * through - but the reply shape is uniform across all 8, so nothing on this
 * side needs to know that; it only matters for the *order* the UI
 * recommends calibrating in, see `CALIBRATION_ORDER`.
 */
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

/**
 * Builds the `calibrate_motors_<bias>` command that trims the left/right
 * motor balance. Unlike the colour commands, the payload here is a
 * continuous value rather than one of a fixed set of names, so it's built
 * rather than looked up - clamped to the board's -1..1 range and rounded to
 * keep the wire string readable (`calibrate_motors_0.3`, not
 * `calibrate_motors_0.30000000000000004`).
 */
export function calibrateMotorsCommand(bias: number): string {
    const clamped = Math.max(-1, Math.min(1, bias))
    return `calibrate_motors_${Math.round(clamped * 100) / 100}`
}

/**
 * Builds the `reverse_motor_<index>_<0|1>` command that sets one motor's
 * spin direction. An absolute set, not a toggle - sending the same command
 * twice is a no-op, which matters because a lost ACK can otherwise cause a
 * legitimate resend to look like a double-flip.
 */
export function reverseMotorCommand(index: 0 | 1, reversed: boolean): string {
    return `reverse_motor_${index}_${reversed ? 1 : 0}`
}

/** Sibling to `reverseMotorCommand` - same absolute-set reasoning, swaps which physical motor answers to "left" and "right". */
export function swapMotorsCommand(swapped: boolean): string {
    return `swap_motors_${swapped ? 1 : 0}`
}

/**
 * Builds the `run_motor_<index>` command that test-drives one motor forward
 * at a fixed speed through the board's normal `Motors.run_motors` pipeline,
 * so it reflects whatever bias/reverse/swap is currently set. Direct action
 * like `STOP_MOTORS`, not a calibration value - there's no reply to wait on.
 */
export function runMotorCommand(index: 0 | 1): string {
    return `run_motor_${index}`
}

/**
 * One argument-less COMMAND per gettable calibration value, replying with
 * the generic `calibration` message type - `{ name, value }` - rather than
 * one message type per calibration kind. `motors` is the only one today;
 * colour calibrations are expected to grow this table later, all answered
 * the same way, which is why the website's handler branches on
 * `message.name` instead of on the message type.
 */
export const GET_CALIBRATION_COMMANDS = {
    motors: 'get_calibration_motors',
} as const

export type CalibrationName = keyof typeof GET_CALIBRATION_COMMANDS

/** Sibling to `CALIBRATE_COLOR_COMMANDS` - clears one colour's calibration back to its default, independently of every other colour. */
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
    'calibration',
    'uploaded',
    'color',
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

// Chunk size and pacing live in frames.ts, next to the AdaptivePacer that
// decides them.
