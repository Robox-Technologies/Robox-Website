/**
 * Packing decides the parcels Australia Post is quoted on, what the customer
 * pays for packaging, and what the warehouse is told to send - so the rules are
 * pinned here rather than discovered from a live quote.
 */

import { describe, expect, it } from 'vitest'

import type { BagCapacity, Packaging, Product } from '@/types/shop'
import {
    BAG_SIZES,
    PARCEL_LIMITS,
    expandToPackingUnits,
    planShipment,
    type PackingUnit,
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

function bagged(id: string, capacity: BagCapacity, weight = 200): Product {
    return baseProduct(id, { weight, packaging: { type: 'bag', capacity } })
}

function boxed(
    id: string,
    dimensions: Packaging,
    packagingCents = 377,
    weight = 500,
): Product {
    return baseProduct(id, {
        weight,
        packaging: { type: 'box', dimensions, packagingCents },
    })
}

const KIT = bagged('kit', { small: 1, medium: 3, large: 10 })

const catalog = (...products: Product[]) =>
    new Map(products.map((product) => [product.item_id, product]))

const units = (...lines: Array<[Product, number]>): PackingUnit[] =>
    expandToPackingUnits(
        lines.map(([product, quantity]) => ({ product, quantity })),
        catalog(...lines.map(([product]) => product)),
    )

describe('expandToPackingUnits', () => {
    it('leaves a plain product alone', () => {
        expect(units([KIT, 2])).toStrictEqual([
            { product: KIT, quantity: 2, weightGrams: 400 },
        ])
    })

    it('expands a bundle into its constituents', () => {
        const pack = baseProduct('pack', { combo: { kit: 10 }, weight: 2000 })
        const expanded = expandToPackingUnits(
            [{ product: pack, quantity: 1 }],
            catalog(KIT, pack),
        )
        expect(expanded).toStrictEqual([
            { product: KIT, quantity: 10, weightGrams: 2000 },
        ])
    })

    it("keeps the bundle's own weight rather than its constituents'", () => {
        // The heavy kit would say 10 x 900g; the bundle says 2000g, and the
        // bundle is the thing being shipped.
        const heavyKit = bagged('kit', { small: 1, medium: 3, large: 10 }, 900)
        const pack = baseProduct('pack', { combo: { kit: 10 }, weight: 2000 })
        const expanded = expandToPackingUnits(
            [{ product: pack, quantity: 1 }],
            catalog(heavyKit, pack),
        )
        expect(expanded[0]!.weightGrams).toBe(2000)
    })

    it('merges a bundle with loose copies, keeping the total weight exact', () => {
        const pack = baseProduct('pack', { combo: { kit: 10 }, weight: 2000 })
        const expanded = expandToPackingUnits(
            [
                { product: KIT, quantity: 1 },
                { product: pack, quantity: 1 },
            ],
            catalog(KIT, pack),
        )
        expect(expanded).toStrictEqual([
            { product: KIT, quantity: 11, weightGrams: 2200 },
        ])
    })

    it('splits a mixed bundle weight across its constituents', () => {
        const other = bagged('other', { small: 1, medium: 2, large: 4 })
        const pack = baseProduct('pack', {
            combo: { kit: 3, other: 1 },
            weight: 800,
        })
        const expanded = expandToPackingUnits(
            [{ product: pack, quantity: 1 }],
            catalog(KIT, other, pack),
        )
        const total = expanded.reduce((sum, u) => sum + u.weightGrams, 0)
        expect(total).toBe(800)
        expect(
            expanded.find((u) => u.product.item_id === 'kit')!.weightGrams,
        ).toBe(600)
    })

    it('rejects a bundle naming a product outside the catalog', () => {
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

describe('planShipment - satchels', () => {
    it('takes the smallest satchel the order fits in', () => {
        expect(
            planShipment(units([KIT, 1])).parcels[0]!.dimensions,
        ).toStrictEqual(SMALL_BAG.dimensions)
        expect(
            planShipment(units([KIT, 3])).parcels[0]!.dimensions,
        ).toStrictEqual(MEDIUM_BAG.dimensions)
        expect(
            planShipment(units([KIT, 10])).parcels[0]!.dimensions,
        ).toStrictEqual(LARGE_BAG.dimensions)
    })

    it('ships one satchel as one parcel', () => {
        const shipment = planShipment(units([KIT, 1]))
        expect(shipment.parcels).toHaveLength(1)
        expect(shipment.packagingCents).toBe(SMALL_BAG.costCents)
        expect(shipment.description).toBe('1 small satchel')
    })

    it('splits into several parcels once one satchel is full', () => {
        const shipment = planShipment(units([KIT, 11]))
        expect(shipment.parcels).toHaveLength(2)
        expect(shipment.packagingCents).toBe(LARGE_BAG.costCents * 2)
        expect(shipment.description).toBe('2 large satchels')
    })

    it('spreads the order across those parcels without losing weight', () => {
        const shipment = planShipment(units([KIT, 11]))
        const packed = shipment.parcels.flatMap((parcel) => parcel.contents)
        const total = packed.reduce((sum, entry) => sum + entry.quantity, 0)
        expect(total).toBe(11)
        expect(shipment.weightGrams).toBe(2200)
    })

    it('lets different products share one satchel by fractions', () => {
        const half = bagged('half', { small: null, medium: null, large: 2 })
        const shipment = planShipment(units([KIT, 2], [half, 1]))
        expect(shipment.parcels).toHaveLength(1)
        expect(shipment.parcels[0]!.dimensions).toStrictEqual(
            LARGE_BAG.dimensions,
        )
    })

    it('will not use a size one of the products does not fit', () => {
        const bulky = bagged('bulky', { small: null, medium: null, large: 4 })
        const shipment = planShipment(units([KIT, 1], [bulky, 1]))
        expect(shipment.parcels[0]!.dimensions).toStrictEqual(
            LARGE_BAG.dimensions,
        )
    })

    it('opens another satchel rather than exceeding the weight limit', () => {
        // Ten fit by bulk, but 10 x 3kg is past the 22kg parcel limit.
        const heavy = bagged(
            'heavy',
            { small: null, medium: null, large: 10 },
            3000,
        )
        const shipment = planShipment(units([heavy, 10]))
        expect(shipment.parcels.length).toBeGreaterThan(1)
        for (const parcel of shipment.parcels) {
            expect(parcel.weightGrams).toBeLessThanOrEqual(
                PARCEL_LIMITS.maxWeightGrams,
            )
        }
    })

    it('refuses a bagged product that fits no satchel', () => {
        const unpackable = bagged('unpackable', {
            small: null,
            medium: null,
            large: null,
        })
        expect(() => planShipment(units([unpackable, 2]))).toThrow(
            /does not fit any satchel/,
        )
    })
})

describe('planShipment - boxes', () => {
    it('ships one parcel per boxed item, each at its own cost', () => {
        const box = boxed('box', { length: 24, width: 16, height: 8 }, 377)
        const shipment = planShipment(units([box, 3]))
        expect(shipment.parcels).toHaveLength(3)
        expect(shipment.packagingCents).toBe(377 * 3)
        expect(shipment.description).toBe('3 boxes')
    })

    it('keeps satchels and cartons as separate parcels', () => {
        const box = boxed('box', { length: 24, width: 16, height: 8 })
        const shipment = planShipment(units([KIT, 1], [box, 1]))
        expect(shipment.parcels).toHaveLength(2)
        expect(shipment.parcels.map((parcel) => parcel.kind)).toStrictEqual([
            'satchel',
            'box',
        ])
        expect(shipment.packagingCents).toBe(SMALL_BAG.costCents + 377)
    })

    it('rejects a carton past the length limit', () => {
        const long = boxed('long', { length: 120, width: 10, height: 10 })
        expect(() => planShipment(units([long, 1]))).toThrow(/longest side/)
    })

    it('rejects a carton past the volume limit', () => {
        const huge = boxed('huge', { length: 100, width: 100, height: 100 })
        expect(() => planShipment(units([huge, 1]))).toThrow(/m³/)
    })

    it('rejects a carton past the weight limit', () => {
        const heavy = boxed(
            'heavy',
            { length: 30, width: 30, height: 30 },
            377,
            25_000,
        )
        expect(() => planShipment(units([heavy, 1]))).toThrow(
            /past Australia Post/,
        )
    })

    it('rejects a carton thinner than the minimum', () => {
        const flat = boxed('flat', { length: 30, width: 20, height: 1 })
        expect(() => planShipment(units([flat, 1]))).toThrow(/thinner than/)
    })
})

describe('planShipment - empty', () => {
    it('has nothing to ship and nothing to charge', () => {
        const shipment = planShipment([])
        expect(shipment.parcels).toStrictEqual([])
        expect(shipment.packagingCents).toBe(0)
        expect(shipment.weightGrams).toBe(0)
        expect(shipment.description).toBe('no packaging')
    })
})

describe('planShipment - every parcel is shippable', () => {
    it('holds for a wide spread of orders', () => {
        const box = boxed('box', { length: 24, width: 16, height: 8 })
        for (let quantity = 1; quantity <= 60; quantity++) {
            for (const shipment of [
                planShipment(units([KIT, quantity])),
                planShipment(units([KIT, quantity], [box, 2])),
            ]) {
                for (const parcel of shipment.parcels) {
                    const { length, width, height } = parcel.dimensions
                    expect(Math.max(length, width, height)).toBeLessThanOrEqual(
                        PARCEL_LIMITS.maxDimensionCm,
                    )
                    expect(length * width * height).toBeLessThanOrEqual(
                        PARCEL_LIMITS.maxVolumeCm3,
                    )
                    expect(parcel.weightGrams).toBeLessThanOrEqual(
                        PARCEL_LIMITS.maxWeightGrams,
                    )
                }
            }
        }
    })
})
