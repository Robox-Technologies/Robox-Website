/**
 * Packing decides both the parcel Australia Post is quoted on and what the
 * customer pays for packaging, so the rules are pinned here rather than
 * discovered from a live quote.
 */

import { describe, expect, it } from 'vitest'

import type { BagCapacity, Packaging, Product } from '@/types/shop'
import {
    BAG_SIZES,
    chooseBags,
    expandToPackingUnits,
    planParcel,
} from '../packaging.server'

const [SMALL_BAG, MEDIUM_BAG, LARGE_BAG] = BAG_SIZES

function baseProduct(id: string, overrides: Partial<Product> = {}): Product {
    return {
        name: id,
        internalName: id,
        description: '',
        banner: '',
        price: 1000,
        currency: 'aud',
        priceId: `price_${id}`,
        prices: { aud: 1000 },
        item_id: id,
        status: 'available',
        weight: 200,
        packaging: {
            type: 'bag',
            capacity: { small: 1, medium: 3, large: 10 },
        },
        combo: null,
        ...overrides,
    }
}

function bagged(id: string, capacity: BagCapacity): Product {
    return baseProduct(id, { packaging: { type: 'bag', capacity } })
}

function boxed(
    id: string,
    dimensions: Packaging,
    packagingCents = 377,
): Product {
    return baseProduct(id, {
        packaging: { type: 'box', dimensions, packagingCents },
    })
}

const KIT = bagged('kit', { small: 1, medium: 3, large: 10 })

function catalog(...products: Product[]) {
    return new Map(products.map((product) => [product.item_id, product]))
}

describe('expandToPackingUnits', () => {
    it('leaves a plain product alone', () => {
        const units = expandToPackingUnits(
            [{ product: KIT, quantity: 2 }],
            catalog(KIT),
        )
        expect(units).toStrictEqual([{ product: KIT, quantity: 2 }])
    })

    it('expands a bundle into its constituents', () => {
        const pack = baseProduct('pack', { combo: { kit: 10 } })
        const units = expandToPackingUnits(
            [{ product: pack, quantity: 1 }],
            catalog(KIT, pack),
        )
        expect(units).toStrictEqual([{ product: KIT, quantity: 10 }])
    })

    it('multiplies bundle contents by how many bundles were ordered', () => {
        const pack = baseProduct('pack', { combo: { kit: 10 } })
        const units = expandToPackingUnits(
            [{ product: pack, quantity: 2 }],
            catalog(KIT, pack),
        )
        expect(units).toStrictEqual([{ product: KIT, quantity: 20 }])
    })

    it('merges a bundle with loose copies of the same product', () => {
        const pack = baseProduct('pack', { combo: { kit: 10 } })
        const units = expandToPackingUnits(
            [
                { product: KIT, quantity: 1 },
                { product: pack, quantity: 1 },
            ],
            catalog(KIT, pack),
        )
        expect(units).toStrictEqual([{ product: KIT, quantity: 11 }])
    })

    it('rejects a bundle naming a product that is not in the catalog', () => {
        const pack = baseProduct('pack', { combo: { missing: 1 } })
        expect(() =>
            expandToPackingUnits(
                [{ product: pack, quantity: 1 }],
                catalog(pack),
            ),
        ).toThrow(/not in the catalog/)
    })

    it('refuses a bundle that contains itself', () => {
        const loop = baseProduct('loop', { combo: { loop: 1 } })
        expect(() =>
            expandToPackingUnits(
                [{ product: loop, quantity: 1 }],
                catalog(loop),
            ),
        ).toThrow(/combo cycle/)
    })
})

describe('chooseBags', () => {
    it('takes the smallest satchel the order fits in', () => {
        expect(chooseBags([{ product: KIT, quantity: 1 }])).toStrictEqual([
            SMALL_BAG,
        ])
        expect(chooseBags([{ product: KIT, quantity: 3 }])).toStrictEqual([
            MEDIUM_BAG,
        ])
        expect(chooseBags([{ product: KIT, quantity: 10 }])).toStrictEqual([
            LARGE_BAG,
        ])
    })

    it('opens more large satchels once one is full', () => {
        // 11 kits is 1.1 large satchels; a part-full satchel still needs a
        // whole satchel.
        expect(chooseBags([{ product: KIT, quantity: 11 }])).toStrictEqual([
            LARGE_BAG,
            LARGE_BAG,
        ])
        expect(chooseBags([{ product: KIT, quantity: 20 }])).toHaveLength(2)
        expect(chooseBags([{ product: KIT, quantity: 21 }])).toHaveLength(3)
    })

    it('lets different products share one satchel by fractions', () => {
        const half = bagged('half', { small: null, medium: null, large: 2 })
        // A fifth of a large satchel plus a half of one still fits in one.
        expect(
            chooseBags([
                { product: KIT, quantity: 2 },
                { product: half, quantity: 1 },
            ]),
        ).toStrictEqual([LARGE_BAG])
    })

    it('will not use a size that one of the products does not fit', () => {
        const bulky = bagged('bulky', { small: null, medium: null, large: 4 })
        // The kit alone would fit a small satchel; the bulky item forces large.
        expect(
            chooseBags([
                { product: KIT, quantity: 1 },
                { product: bulky, quantity: 1 },
            ]),
        ).toStrictEqual([LARGE_BAG])
    })

    it('returns nothing when the order is all boxes', () => {
        const box = boxed('box', { length: 24, width: 16, height: 8 })
        expect(chooseBags([{ product: box, quantity: 2 }])).toStrictEqual([])
    })

    it('refuses a bagged product that fits no satchel', () => {
        const unpackable = bagged('unpackable', {
            small: null,
            medium: null,
            large: null,
        })
        expect(() =>
            chooseBags([{ product: unpackable, quantity: 1 }]),
        ).toThrow(/does not fit any satchel/)
    })
})

describe('planParcel', () => {
    it('quotes a single bagged item as its satchel', () => {
        const plan = planParcel([{ product: KIT, quantity: 1 }])
        expect(plan.parcel).toStrictEqual({
            length: SMALL_BAG.dimensions.length,
            width: SMALL_BAG.dimensions.width,
            height: SMALL_BAG.dimensions.height,
        })
        expect(plan.packagingCents).toBe(SMALL_BAG.costCents)
        expect(plan.description).toBe('1 small satchel')
    })

    it('adds volume rather than stacking heights', () => {
        // Two large satchels: same footprint, twice the volume, so twice the
        // height - not four satchels' worth.
        const plan = planParcel([{ product: KIT, quantity: 11 }])
        expect(plan.parcel.length).toBe(LARGE_BAG.dimensions.length)
        expect(plan.parcel.width).toBe(LARGE_BAG.dimensions.width)
        expect(plan.parcel.height).toBe(LARGE_BAG.dimensions.height * 2)
        expect(plan.packagingCents).toBe(LARGE_BAG.costCents * 2)
        expect(plan.description).toBe('2 large satchels')
    })

    it('preserves total volume across a mixed order', () => {
        const box = boxed('box', { length: 24, width: 16, height: 8 })
        const plan = planParcel([
            { product: KIT, quantity: 1 },
            { product: box, quantity: 1 },
        ])

        const bagVolume =
            SMALL_BAG.dimensions.length *
            SMALL_BAG.dimensions.width *
            SMALL_BAG.dimensions.height
        const boxVolume = 24 * 16 * 8
        const quoted =
            plan.parcel.length * plan.parcel.width * plan.parcel.height

        // Rounding the height to a whole centimetre can only ever add volume.
        expect(quoted).toBeGreaterThanOrEqual(bagVolume + boxVolume)
        expect(quoted).toBeLessThan(
            bagVolume + boxVolume + plan.parcel.length * plan.parcel.width,
        )
    })

    it('uses the largest footprint in the order', () => {
        const wide = boxed('wide', { length: 60, width: 40, height: 2 })
        const plan = planParcel([
            { product: KIT, quantity: 1 },
            { product: wide, quantity: 1 },
        ])
        expect(plan.parcel.length).toBe(60)
        expect(plan.parcel.width).toBe(40)
    })

    it('is never shorter than the tallest thing inside it', () => {
        const tall = boxed('tall', { length: 5, width: 5, height: 30 })
        const plan = planParcel([{ product: tall, quantity: 1 }])
        expect(plan.parcel.height).toBeGreaterThanOrEqual(30)
    })

    it('charges each box its own packaging cost, per unit', () => {
        const box = boxed('box', { length: 24, width: 16, height: 8 }, 377)
        const plan = planParcel([{ product: box, quantity: 3 }])
        expect(plan.packagingCents).toBe(377 * 3)
        expect(plan.description).toBe('3 boxes')
    })

    it('sums satchel and box costs together', () => {
        const box = boxed('box', { length: 24, width: 16, height: 8 }, 377)
        const plan = planParcel([
            { product: KIT, quantity: 1 },
            { product: box, quantity: 1 },
        ])
        expect(plan.packagingCents).toBe(SMALL_BAG.costCents + 377)
        expect(plan.description).toBe('1 small satchel, 1 box')
    })

    it('falls back to a quotable parcel for an empty order', () => {
        const plan = planParcel([])
        expect(plan.parcel).toStrictEqual(SMALL_BAG.dimensions)
        expect(plan.packagingCents).toBe(0)
    })

    it('reports whole-centimetre dimensions for the height', () => {
        const plan = planParcel([{ product: KIT, quantity: 7 }])
        expect(Number.isInteger(plan.parcel.height)).toBe(true)
    })
})
