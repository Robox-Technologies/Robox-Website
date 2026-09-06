/**
 * Framed upload driver: the sender half of credit-based batching. Advances on a
 * cumulative ACK, rewinds on a NAK, resends from the window base on a timeout.
 */

import {
    CreditWindow,
    INITIAL_CREDIT,
    Kind,
    encodeProgram,
    frameText,
    parseFlow,
    programChecksum,
    programLineCount,
    type Frame,
} from './frames'
import type { BaseTransport } from './transportBase'

/** How long to wait for an ACK before resending from the window base. */
const ACK_TIMEOUT_MS = 750

/** Give up rather than looping on a link that is not coming back. */
const MAX_RETRANSMITS = 40

/** How long to wait for the board's verdict after the END frame. */
const VERDICT_TIMEOUT_MS = 8000

export interface UploadResult {
    verified: boolean
    lines: number
    expectedLines: number
    checksum: string
    expectedChecksum: string
    retransmits: number
    frames: number
    /** Pacing state after the upload, when the transport paces itself. */
    pacing: Record<string, number | null> | null
    /** Present when the board reported a problem instead of a verdict. */
    error?: string
}

interface Verdict {
    ok: boolean
    lines: number
    expected: number
    crc: string
    want: string
}

function isVerdict(value: unknown): value is Verdict {
    if (!value || typeof value !== 'object') return false
    const candidate = value as Record<string, unknown>
    return (
        typeof candidate.ok === 'boolean' && typeof candidate.crc === 'string'
    )
}

function delay(milliseconds: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, milliseconds))
}

/** Upload `code` over `transport`. Rejects on a failed verification rather than resolving. */
export async function uploadProgram(
    transport: BaseTransport,
    code: string,
): Promise<UploadResult> {
    // From the connection's counter, so the upload and surrounding commands stay ordered.
    const startSeq = transport.peekSequence()
    const frames = encodeProgram(code, startSeq)
    transport.takeSequence(frames.length)

    const window = new CreditWindow(frames, startSeq, INITIAL_CREDIT)

    let verdict: Verdict | null = null
    let deviceError: string | null = null

    const onFrame = (frame: Frame) => {
        if (frame.kind === Kind.ACK) {
            const { expectedSeq, credit } = parseFlow(frame.payload)
            const advanced = window.onAck(expectedSeq, credit)
            // Only an ACK that moved the window is evidence the link is coping.
            if (advanced) transport.notePacingClean()
        } else if (frame.kind === Kind.NAK) {
            const { expectedSeq } = parseFlow(frame.payload)
            window.onNak(expectedSeq)
            transport.notePacingLoss()
        }
    }

    // The verdict arrives as a REPLY, which the transport dispatches as an ordinary message.
    const onUploaded = (payload: unknown) => {
        if (isVerdict(payload)) verdict = payload
    }
    const onError = ({ message }: { message: string }) => {
        deviceError = message
    }

    transport.setFlowListener(onFrame)
    transport.parentPico.on('uploaded', onUploaded)
    transport.parentPico.on('error', onError)

    try {
        let lastProgress = Date.now()
        let rounds = 0

        while (!window.complete()) {
            if (deviceError) break

            // Backstop, so a logic error surfaces as a failure rather than a hang.
            rounds += 1
            if (rounds > 10000) {
                throw new Error(
                    'Upload made no progress. Try reconnecting your Ro/Box.',
                )
            }

            const batch = window.ready()

            if (batch.length) {
                // Before sending: an ACK can land mid-write, and must see the frames in flight.
                window.advance(batch.length)
                await transport.writeFrames(batch)
                lastProgress = Date.now()
            } else if (Date.now() - lastProgress > ACK_TIMEOUT_MS) {
                // Credit spent with no ACK, so one was lost; resend from the base.
                if (window.retransmits >= MAX_RETRANSMITS) {
                    throw new Error(
                        'Lost contact with the Ro/Box while sending your program. Try reconnecting it.',
                    )
                }
                window.rewindToBase()
                // A silent peer is the same evidence as a NAK.
                transport.notePacingLoss()
                lastProgress = Date.now()
            } else {
                await delay(5)
            }
        }

        const verdictDeadline = Date.now() + VERDICT_TIMEOUT_MS
        while (!verdict && !deviceError && Date.now() < verdictDeadline) {
            await delay(10)
        }

        const expectedChecksum = programChecksum(code)
            .toString(16)
            .padStart(8, '0')
        const expectedLines = programLineCount(code)

        if (deviceError) {
            throw new Error(deviceError)
        }

        if (!verdict) {
            throw new Error(
                'The Ro/Box never confirmed your program. Try reconnecting it.',
            )
        }

        const confirmed: Verdict = verdict
        const result: UploadResult = {
            verified: confirmed.ok && confirmed.crc === expectedChecksum,
            lines: confirmed.lines,
            expectedLines,
            checksum: confirmed.crc,
            expectedChecksum,
            retransmits: window.retransmits,
            frames: window.total,
            pacing: transport.pacingStats(),
        }

        if (!result.verified) {
            throw new Error(
                `Your program did not arrive intact (${result.lines} of ${result.expectedLines} lines). Nothing has been run.`,
            )
        }

        return result
    } finally {
        transport.setFlowListener(null)
        transport.parentPico.off('uploaded', onUploaded)
        transport.parentPico.off('error', onError)
    }
}

/** Frame count for a program, for progress reporting. */
export function frameCount(code: string): number {
    return encodeProgram(code).length
}

/** Text of a REPLY frame, for logging a raw device message. */
export function replyText(frame: Frame): string {
    return frameText(frame)
}
