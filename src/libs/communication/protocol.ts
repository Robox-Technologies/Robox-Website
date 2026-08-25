import type { PicoMessageType } from 'src/types/communication'

/**
 * The single source of truth for the Ro/Box wire protocol.
 *
 * The firmware has its own copy of this table in `src/main.py`
 * (Robox-pythonLibs). The two must not drift, so anything added here needs a
 * matching branch in the firmware's receive loop and vice versa.
 */

/**
 * Commands the board acts on.
 *
 * These are sent as bare lines, which is a hazard rather than a design: the
 * firmware compares every received line against this table, so a line of
 * *user code* that happens to match is executed instead of being stored.
 * Nothing about the strings themselves can fix that -- a more obscure sentinel
 * is still a string somebody can type into the editor. The fix is to stop
 * scanning payload content for control markers at all.
 */
export const COMMANDS = {
    FIRMWARE_CHECK: 'x01FIRMCHECK\r',
    START_UPLOAD: 'x02BEGINUPLD\r',
    END_UPLOAD: 'x03ENDUPLD\r',
    START_PROGRAM: 'x04STARTPROG\r',
    CALIBRATE_COLOR: 'x05COLORCALIBRATE\r',
    RESTART: 'x06RESTART\r',
    BOOTLOADER: 'x07BOOTLOADER\r',
    DISCONNECT: 'x08DISCONNECT\r',
} as const

/**
 * Bare command lines, without the trailing carriage return.
 *
 * Used to detect when user code would collide with a command, so the collision
 * can be reported instead of silently changing what the board does.
 */
export const COMMAND_LINES: readonly string[] = Object.values(COMMANDS).map(
    (command) => command.trim(),
)

/**
 * True when a line of user code would be swallowed as a command by the
 * firmware's in-band dispatch.
 */
export function collidesWithCommand(line: string): boolean {
    return COMMAND_LINES.includes(line.trim())
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
]

/** The firmware version this build of the site expects to be talking to. */
export const CURRENT_FIRMWARE_VERSION = '1.0.0'

/** HM-10 UART service and characteristic, shared by both Bluetooth transports. */
export const UART_SERVICE = 0xffe0
export const UART_CHARACTERISTIC = 0xffe1

/**
 * Bytes per write-without-response. 20 is the guaranteed-safe ATT payload for
 * the default 23-byte MTU, which is all the HM-10 negotiates.
 */
export const BLE_CHUNK_SIZE = 20

/** Pacing between chunks, in milliseconds. */
export const BLE_WRITE_DELAY_MS = 40
