/**
 * The one place a postage figure is adjusted before it's charged.
 */

import { describe, expect, it } from 'vitest'

import { applyShippingSurcharge } from '../shippingCost.server'

describe('applyShippingSurcharge', () => {
    it('adds the packaging cost to the quote', () => {
        expect(applyShippingSurcharge(1000, 165)).toBe(1170)
    })

    it('rounds up to the nearest 10c, never down', () => {
        expect(applyShippingSurcharge(1200, 0)).toBe(1200)
        expect(applyShippingSurcharge(1201, 0)).toBe(1210)
        expect(applyShippingSurcharge(1209, 0)).toBe(1210)
        expect(applyShippingSurcharge(1035, 165)).toBe(1200)
        expect(applyShippingSurcharge(1036, 165)).toBe(1210)
    })

    it('never charges less than quote plus packaging', () => {
        for (let raw = 0; raw <= 3000; raw += 7) {
            for (const packaging of [0, 165, 275, 345, 690]) {
                expect(
                    applyShippingSurcharge(raw, packaging),
                ).toBeGreaterThanOrEqual(raw + packaging)
            }
        }
    })

    it('never overshoots by a full rounding step', () => {
        for (let raw = 0; raw <= 3000; raw += 7) {
            expect(applyShippingSurcharge(raw, 165) - (raw + 165)).toBeLessThan(
                10,
            )
        }
    })

    it('charges nothing when there is no quote and no packaging', () => {
        expect(applyShippingSurcharge(0, 0)).toBe(0)
    })
})
