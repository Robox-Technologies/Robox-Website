/**
 * Turning a byte stream into messages.
 *
 * Every transport receives arbitrarily-split chunks -- BLE notifications are
 * capped at 20 bytes and a `TextDecoderStream` splits wherever it likes -- so
 * none of them may assume a chunk is a whole message. They all funnel through
 * `parseBufferedMessages`, which extracts complete JSON objects and hands back
 * the unconsumed tail to be prepended to the next chunk.
 */

import type { PicoMessage } from 'src/types/communication'
import { MESSAGE_TYPES } from './protocol'

/**
 * Control characters that corrupt JSON framing. Stripped before parsing
 * because a dropped BLE packet often leaves a stray null byte behind.
 * Tab, newline and carriage return are deliberately excluded -- they are legal
 * whitespace and appear inside real payloads.
 */
const CONTROL_CHARACTERS =
    /[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g

/**
 * Hard cap on the retained tail.
 *
 * Without this, a single unterminated `{` -- exactly what a dropped packet
 * leaves behind -- pins the buffer forever and it grows without bound for the
 * rest of the session. On overflow we drop everything before the most recent
 * `{`, which resynchronises on the next whole message.
 */
export const MAX_BUFFER_LENGTH = 8192

export interface ParseResult {
    messages: PicoMessage[]
    remainder: string
    /**
     * Count of things thrown away: objects that failed to parse, objects that
     * were not valid messages, and buffer overflow discards. Surfaced so
     * dropped packets can be counted instead of vanishing silently.
     */
    discarded: number
}

export function parseBufferedMessages(buffer: string): ParseResult {
    const sanitized = buffer.replace(CONTROL_CHARACTERS, '')
    const messages: PicoMessage[] = []
    let cursor = 0
    let firstIncompleteStart = -1
    let discarded = 0

    while (cursor < sanitized.length) {
        const start = sanitized.indexOf('{', cursor)
        if (start === -1) break

        const end = findJsonObjectEnd(sanitized, start)
        if (end === -1) {
            if (firstIncompleteStart === -1) firstIncompleteStart = start
            // Keep scanning: a later '{' can still open a valid object even
            // when this one never closes.
            cursor = start + 1
            continue
        }

        const candidate = sanitized.slice(start, end + 1)
        try {
            const parsed: unknown = JSON.parse(candidate)
            if (isPicoMessage(parsed)) {
                messages.push(parsed)
                cursor = end + 1
                firstIncompleteStart = -1
                continue
            }
            discarded += 1
        } catch {
            // Malformed object; resume from the next '{'.
            discarded += 1
        }

        cursor = start + 1
    }

    let remainder =
        firstIncompleteStart === -1 ? '' : sanitized.slice(firstIncompleteStart)

    if (remainder.length > MAX_BUFFER_LENGTH) {
        const lastStart = remainder.lastIndexOf('{')
        discarded += lastStart === -1 ? remainder.length : lastStart
        remainder = lastStart === -1 ? '' : remainder.slice(lastStart)
    }

    return { messages, remainder, discarded }
}

function findJsonObjectEnd(input: string, startIndex: number): number {
    let depth = 0
    let inString = false
    let escaped = false

    for (let i = startIndex; i < input.length; i += 1) {
        const char = input[i]

        if (inString) {
            if (escaped) {
                escaped = false
            } else if (char === '\\') {
                escaped = true
            } else if (char === '"') {
                inString = false
            }
            continue
        }

        if (char === '"') {
            inString = true
            continue
        }

        if (char === '{') {
            depth += 1
        } else if (char === '}') {
            depth -= 1
            if (depth === 0) return i
            if (depth < 0) return -1
        }
    }

    return -1
}

export function isPicoMessage(value: unknown): value is PicoMessage {
    if (!value || typeof value !== 'object') return false
    if (!('type' in value) || !('message' in value)) return false

    const { type, message } = value as Record<string, unknown>

    return (
        typeof type === 'string' &&
        (MESSAGE_TYPES as readonly string[]).includes(type) &&
        typeof message !== 'undefined'
    )
}

/** Normalises anything throwable into a message safe to show a user. */
export function errorMessage(
    error: unknown,
    fallback = 'Unknown error',
): string {
    if (error instanceof Error) return error.message
    if (typeof error === 'string' && error) return error
    return String(error || fallback)
}
