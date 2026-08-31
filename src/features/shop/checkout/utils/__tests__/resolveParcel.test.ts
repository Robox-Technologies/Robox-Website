/**
 * The parcel drives the Australia Post quote as much as the weight does, so
 * these pin the stacking rule that turns a cart into one box.
 */

import { describe, expect, it } from 'vitest'

import { resolveParcel, type ResolvedEntry } from '../checkoutPricing.server'
import { DEFAULT_PACKAGING } from '@/utils/server/stripe/readPrice.server'

function entry(
    packaging: { length: number; width: number; height: number },
    quantity = 1,
): ResolvedEntry {
    return {
        itemId: 'prod_test',
        priceId: 'price_test',
        quantity,
        unitPriceCents: 1000,
        weight: 100,
        unitVolume: 1,
        packaging,
    }
}

const SMALL = { length: 24, width: 16, height: 8 }
const WIDE = { length: 40, width: 30, height: 4 }

describe('resolveParcel', () => {
    it("uses a single product's own box", () => {
        expect(resolveParcel([entry(SMALL)])).toStrictEqual(SMALL)
    })

    it('stacks height by quantity', () => {
        expect(resolveParcel([entry(SMALL, 3)])).toStrictEqual({
            length: 24,
            width: 16,
            height: 24,
        })
    })

    it('takes the largest footprint and adds the heights', () => {
        expect(resolveParcel([entry(SMALL), entry(WIDE)])).toStrictEqual({
            length: 40,
            width: 30,
            height: 12,
        })
    })

    it('is order independent', () => {
        expect(resolveParcel([entry(SMALL, 2), entry(WIDE)])).toStrictEqual(
            resolveParcel([entry(WIDE), entry(SMALL, 2)]),
        )
    })

    it('never returns a parcel smaller than any item in it', () => {
        const parcel = resolveParcel([entry(SMALL, 2), entry(WIDE, 3)])
        for (const item of [SMALL, WIDE]) {
            expect(parcel.length).toBeGreaterThanOrEqual(item.length)
            expect(parcel.width).toBeGreaterThanOrEqual(item.width)
            expect(parcel.height).toBeGreaterThanOrEqual(item.height)
        }
    })

    it('falls back to the default box for an empty cart', () => {
        // Reachable only if shipping is quoted with nothing to ship; a zero
        // parcel would make Australia Post reject the request outright.
        expect(resolveParcel([])).toStrictEqual(DEFAULT_PACKAGING)
    })
})
