import { describe, it, expect, vi } from 'vitest'
import type { UserExtensions } from 'src/types/projects'

vi.mock('@/features/editor/config/preamble', () => ({
    preamble: 'BASE\n',
    ExtensionsPreamble: { FIRST: 'first_setup()', SECOND: 'second_setup()' },
    ExtraSensorsPreamble: {},
}))

const { buildPreamble } = await import('@/features/editor/utils/preamble')

const withExtensions = (extensions: Record<string, boolean>) =>
    buildPreamble({ extensions: extensions as UserExtensions })

describe('buildPreamble extensions', () => {
    it('uses the preamble of the extension that is enabled, not the first one', () => {
        const code = withExtensions({ FIRST: false, SECOND: true })
        expect(code).toContain('second_setup()')
        expect(code).not.toContain('first_setup()')
    })

    it('skips enabled extensions that have no preamble', () => {
        expect(withExtensions({ NO_PREAMBLE: true, SECOND: true })).toBe(
            'BASE\nsecond_setup()',
        )
    })
})
