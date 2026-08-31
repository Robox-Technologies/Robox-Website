/**
 * The one place a postage figure is adjusted before it's charged, so the sums
 * here are the difference between covering a parcel and being short on it.
 */

import { describe, expect, it } from 'vitest'

import { applyShippingSurcharge, PACKAGING_CENTS } from '../shippingCost.server'

describe('applyShippingSurcharge', () => {
    it('adds the packaging cost', () => {
        // Pinned against the constant rather than a literal so this keeps
        // holding once the real figure is set.
        expect(applyShippingSurcharge(1000)).toBe(
            Math.ceil((1000 + PACKAGING_CENTS) / 10) * 10,
        )
    })

    it('rounds up to the nearest 10c, never down', () => {
        const base = 1200 - PACKAGING_CENTS
        expect(applyShippingSurcharge(base)).toBe(1200)
        expect(applyShippingSurcharge(base + 1)).toBe(1210)
        expect(applyShippingSurcharge(base + 9)).toBe(1210)
        expect(applyShippingSurcharge(base + 10)).toBe(1210)
    })

    it('never charges less than Australia Post quoted', () => {
        for (let raw = 0; raw <= 5000; raw++) {
            expect(applyShippingSurcharge(raw)).toBeGreaterThanOrEqual(raw)
        }
    })

    it('never overshoots by more than the packaging cost plus a rounding step', () => {
        for (let raw = 0; raw <= 5000; raw++) {
            expect(applyShippingSurcharge(raw) - raw).toBeLessThan(
                PACKAGING_CENTS + 10,
            )
        }
    })

    it('still charges packaging on a zero postage quote', () => {
        // The box costs the same whether or not the postage was free. This is
        // only reachable when Australia Post itself quotes 0 - "no address
        // yet" never gets here, because `calculateCheckoutTotals` leaves
        // shipping at 0 without calling this at all.
        expect(applyShippingSurcharge(0)).toBe(
            Math.ceil(PACKAGING_CENTS / 10) * 10,
        )
    })

    it('returns a whole number of cents', () => {
        for (const raw of [0, 1, 999, 1170, 3333]) {
            expect(Number.isInteger(applyShippingSurcharge(raw))).toBe(true)
        }
    })
})
