import { describe, expect, it } from 'vitest'
import { classify, stageWrap } from '../connectionDiagnostics'

describe('connection diagnostics classifier', () => {
    it('classifies a blocked Bluetooth permission', () => {
        const error = Object.assign(
            new DOMException('User denied permission', 'NotAllowedError'),
            {
                stage: 'chooser' as const,
                transport: 'bluetooth' as const,
            },
        )

        expect(classify(error).title).toBe('Bluetooth access is blocked')
    })

    it('preserves the stage and name when wrapping an error', async () => {
        await expect(
            stageWrap(
                'chooser',
                Promise.reject(new Error('blocked')),
                'bluetooth',
            ),
        ).rejects.toMatchObject({
            name: 'Error',
            stage: 'chooser',
            transport: 'bluetooth',
        })
    })

    it('uses a loose message hint for an unavailable adapter', () => {
        const error = Object.assign(
            new Error('Bluetooth adapter is not available'),
            {
                name: 'NotFoundError',
                stage: 'chooser' as const,
                transport: 'bluetooth' as const,
            },
        )

        expect(classify(error).title).toBe('Bluetooth adapter is unavailable')
    })

    it('returns an actionable fallback for an unclassified error', () => {
        const error = Object.assign(new Error('new Chromium wording'), {
            name: 'OperationError',
            stage: 'transfer' as const,
            transport: 'usb' as const,
        })

        expect(classify(error).fix).toContain('Copy diagnostics')
    })
})
