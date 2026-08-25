/**
 * Framed upload driver: the sender half of credit-based batching.
 *
 * Sends frames back to back within the credit the board granted, advances on a
 * cumulative ACK, rewinds on a NAK, and resends from the window base if
 * neither arrives. Nothing here calls the upload good until the board reports a
 * matching line count and CRC, which is what lets `runCode` be gated on it.
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
    pacing: Record<string, number> | null
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

/**
 * Upload `code` over `transport` and wait for the board to confirm it.
 *
 * Rejects rather than resolving on a failed verification: a caller that awaits
 * this and then runs the program cannot accidentally run a bad upload.
 */
export async function uploadProgram(
    transport: BaseTransport,
    code: string,
): Promise<UploadResult> {
    // Draw from the connection's counter so the upload and the commands around
    // it form one ordered stream rather than three independent ones.
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
            // Only an ACK that actually moved the window is evidence the link
            // is coping. A repeat of one we already had proves nothing.
            if (advanced) transport.notePacingClean()
        } else if (frame.kind === Kind.NAK) {
            const { expectedSeq } = parseFlow(frame.payload)
            window.onNak(expectedSeq)
            transport.notePacingLoss()
        }
    }

    // The board's verdict arrives as a REPLY frame, which the transport
    // unwraps and dispatches as an ordinary message, so it is picked up here
    // rather than in the flow listener.
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

            // Backstop: MAX_RETRANSMITS bounds the timeout path, but a logic
            // error elsewhere should surface as a failure, not a hang.
            rounds += 1
            if (rounds > 10000) {
                throw new Error(
                    'Upload made no progress. Try reconnecting your Ro/Box.',
                )
            }

            const batch = window.ready()

            if (batch.length) {
                // Account for the batch before sending it. An ACK can land
                // while the write is still in progress, and if the window has
                // not recorded the frames as in flight by then, advancing
                // afterwards pushes past frames that were never sent.
                window.advance(batch.length)
                await transport.writeFrames(batch)
                lastProgress = Date.now()
            } else if (Date.now() - lastProgress > ACK_TIMEOUT_MS) {
                // The credit is spent and no ACK came back, so one was lost.
                // Resending from the base is what stops that stalling forever.
                if (window.retransmits >= MAX_RETRANSMITS) {
                    throw new Error(
                        'Lost contact with the Ro/Box while sending your program. Try reconnecting it.',
                    )
                }
                window.rewindToBase()
                // A silent peer is the same evidence as a NAK: we are offering
                // faster than it can take.
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
