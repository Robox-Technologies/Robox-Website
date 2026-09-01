/**
 * Money formatting is the one place a display bug reads as a pricing bug, so
 * these pin both the AUD output the site has always shown and the behaviour
 * the multi-currency storefront depends on.
 */

import { describe, expect, it } from 'vitest'

import { formatMoney, formatPrice, minorUnitDivisor } from '../formatPrice'

/** The implementation `formatPrice` replaced, kept to prove the parity claims. */
function legacyFormatPrice(price: number, forceCents = false): string {
    return `AU$${(price / 100).toFixed(!forceCents && Number.isInteger(price) ? 0 : 2)}`
}

describe('minorUnitDivisor', () => {
    it("uses Stripe's notion of minor units, not the locale's", () => {
        expect(minorUnitDivisor('aud')).toBe(100)
        expect(minorUnitDivisor('jpy')).toBe(1)
        expect(minorUnitDivisor('kwd')).toBe(1000)
    })

    it('is case insensitive', () => {
        expect(minorUnitDivisor('JPY')).toBe(minorUnitDivisor('jpy'))
    })

    it('defaults unknown currencies to two decimals', () => {
        expect(minorUnitDivisor('zzz')).toBe(100)
    })
})

describe('formatPrice (AUD)', () => {
    it('renders whole dollars without cents, and cents on request', () => {
        expect(formatPrice(3500)).toBe('AU$35')
        expect(formatPrice(3500, true)).toBe('AU$35.00')
        expect(formatPrice(33000)).toBe('AU$330')
        expect(formatPrice(0, true)).toBe('AU$0.00')
    })

    it('no longer rounds a part-dollar amount up to the next dollar', () => {
        // The old implementation asked `Number.isInteger` about the *minor*
        // units, which are always integral, so 35.50 rendered as "AU$36".
        expect(legacyFormatPrice(3550)).toBe('AU$36')
        expect(formatPrice(3550)).toBe('AU$35.50')
    })

    it('groups thousands', () => {
        expect(formatPrice(132000)).toBe('AU$1,320')
        expect(formatPrice(132050, true)).toBe('AU$1,320.50')
    })

    it('matches the previous output for every whole-dollar amount', () => {
        for (let dollars = 0; dollars <= 2000; dollars++) {
            const cents = dollars * 100
            // Grouping is the one intended divergence, so compare against the
            // legacy string with its separators removed.
            expect(formatPrice(cents).replace(/,/g, '')).toBe(
                legacyFormatPrice(cents),
            )
            expect(formatPrice(cents, true).replace(/,/g, '')).toBe(
                legacyFormatPrice(cents, true),
            )
        }
    })

    it('keeps negative amounts negative', () => {
        expect(formatPrice(-3550, true)).toBe('-AU$35.50')
    })
})

describe('formatMoney', () => {
    it("honours each currency's minor unit", () => {
        // 3550 minor units is 35.50 in AUD but 3550 whole yen.
        expect(formatMoney(3550, 'aud', { forceCents: true })).toBe('AU$35.50')
        expect(formatMoney(3550, 'jpy', { forceCents: true })).toBe('¥3,550')
        // `Intl` separates a fallback code from the digits with U+00A0, not a
        // plain space - so never compare these strings without normalising.
        expect(
            formatMoney(3550, 'kwd', { forceCents: true }).replace(/\s/g, ' '),
        ).toBe('KWD 3.550')
    })

    it('disambiguates the dollar currencies', () => {
        const dollars = ['aud', 'usd', 'nzd', 'cad', 'sgd', 'hkd'].map((code) =>
            formatMoney(1000, code, { forceCents: true }),
        )
        expect(dollars).toStrictEqual([
            'AU$10.00',
            'US$10.00',
            'NZ$10.00',
            'CA$10.00',
            'S$10.00',
            'HK$10.00',
        ])
        // The whole point: no two render identically.
        expect(new Set(dollars).size).toBe(dollars.length)
    })

    it('accepts an upper-case code', () => {
        expect(formatMoney(1000, 'AUD', { forceCents: true })).toBe('AU$10.00')
    })

    it('falls back to the bare code rather than throwing on a bad currency', () => {
        expect(formatMoney(1000, 'not-a-currency')).toContain('NOT-A-CURRENCY')
    })

    it('never renders a rounded-away cent', () => {
        for (let minor = 0; minor < 500; minor++) {
            const rendered = formatMoney(minor, 'aud', { forceCents: true })
            const parsed = Number(rendered.replace(/[^0-9.]/g, ''))
            expect(Math.round(parsed * 100)).toBe(minor)
        }
    })
})
