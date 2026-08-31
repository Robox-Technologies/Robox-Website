import type { BagCapacity, Packaging, Product } from '@/types/shop'

/**
 * The satchels the shop stocks, smallest first.
 *
 * Shop-wide rather than per product: every bagged item goes into one of these
 * three, so a product only has to say how many of it fit in each. Dimensions in
 * centimetres, cost in cents, both carried over from the old `fees.json`.
 */
export const BAG_SIZES = [
    {
        size: 'small' as const,
        costCents: 165,
        dimensions: { length: 22.9, width: 15.1, height: 5 },
    },
    {
        size: 'medium' as const,
        costCents: 275,
        dimensions: { length: 43, width: 28.5, height: 5 },
    },
    {
        size: 'large' as const,
        costCents: 345,
        dimensions: { length: 48.5, width: 36, height: 5 },
    },
]

type BagSize = (typeof BAG_SIZES)[number]

/** The largest satchel, which is what an overflowing order is packed into. */
const LARGEST_BAG = BAG_SIZES[BAG_SIZES.length - 1]!

/** A product and how many of it are being packed, after bundles are expanded. */
export type PackingUnit = {
    product: Product
    quantity: number
}

export type ParcelPlan = {
    /** One parcel covering the whole order. */
    parcel: Packaging
    /** What the packaging itself costs: every satchel and every carton used. */
    packagingCents: number
    /** Readable breakdown, e.g. "1 large satchel, 2 boxes". */
    description: string
}

export type CartProductLine = {
    product: Product
    quantity: number
}

/**
 * Expands bundles into the products they are actually made of.
 *
 * A bundle is a billing concept; the warehouse packs its contents. The ten-pack
 * is ten kits in one satchel, so it has to be measured as ten kits rather than
 * as one opaque item.
 *
 * Only dimensions come through here. Weight is taken from each cart product's
 * own `weight`, which already accounts for a bundle's contents - expanding for
 * weight would count them twice.
 */
export function expandToPackingUnits(
    lines: CartProductLine[],
    catalogById: Map<string, Product>,
): PackingUnit[] {
    const totals = new Map<string, PackingUnit>()

    const add = (product: Product, quantity: number, depth: number) => {
        // A bundle containing itself, directly or through a chain, would other-
        // wise recurse until the stack gives out.
        if (depth > 5) {
            throw new Error(
                `Bundle nesting is too deep at product ${product.name} - check for a combo cycle`,
            )
        }

        if (product.combo) {
            for (const [productId, count] of Object.entries(product.combo)) {
                const constituent = catalogById.get(productId)
                if (!constituent) {
                    throw new Error(
                        `Product ${product.name} lists ${productId} in its combo, which is not in the catalog`,
                    )
                }
                add(constituent, quantity * count, depth + 1)
            }
            return
        }

        const existing = totals.get(product.item_id)
        if (existing) {
            existing.quantity += quantity
            return
        }
        totals.set(product.item_id, { product, quantity })
    }

    for (const line of lines) {
        add(line.product, line.quantity, 0)
    }

    return [...totals.values()]
}

function volumeOf({ length, width, height }: Packaging): number {
    return length * width * height
}

function footprintOf({ length, width }: Packaging): number {
    return length * width
}

/**
 * How much of one satchel of the given size this order's bagged items take up.
 *
 * Each unit consumes `1 / capacity` of the satchel, so products can share one:
 * an item that fits ten to a large satchel takes a tenth of it. A product that
 * doesn't fit the size at all makes the whole size unusable.
 */
function occupancy(units: PackingUnit[], size: keyof BagCapacity): number {
    let total = 0
    for (const unit of units) {
        if (unit.product.packaging.type !== 'bag') continue

        const capacity = unit.product.packaging.capacity[size]
        if (capacity === null) return Infinity
        total += unit.quantity / capacity
    }
    return total
}

/**
 * The satchels needed for the bagged part of an order.
 *
 * Takes the smallest single satchel everything fits in. Past that it opens whole
 * large satchels and rounds up, which over-states a part-full last satchel -
 * the direction the error should fall, since Australia Post prices on size.
 */
export function chooseBags(units: PackingUnit[]): BagSize[] {
    const hasBagged = units.some(
        (unit) => unit.product.packaging.type === 'bag',
    )
    if (!hasBagged) return []

    for (const bag of BAG_SIZES) {
        if (occupancy(units, bag.size) <= 1) return [bag]
    }

    const needed = occupancy(units, LARGEST_BAG.size)
    if (!Number.isFinite(needed)) {
        const offender = units.find(
            (unit) =>
                unit.product.packaging.type === 'bag' &&
                unit.product.packaging.capacity[LARGEST_BAG.size] === null,
        )
        throw new Error(
            `Product ${offender?.product.name ?? 'unknown'} does not fit any satchel size - it needs bagCapacity metadata or a box`,
        )
    }

    return Array.from({ length: Math.ceil(needed) }, () => LARGEST_BAG)
}

/**
 * Turns an order into the single parcel Australia Post is quoted on.
 *
 * Volumes are added rather than heights stacked. Australia Post prices a parcel
 * on its cubic size, so total volume is the figure that matters; stacking
 * heights instead invents a tall thin parcel that quotes far above what the
 * order really costs to send.
 *
 * The footprint is that of the largest single item, and the height is whatever
 * makes the volume add up - floored at the tallest item, since a parcel can
 * never be shorter than what is inside it.
 */
export function planParcel(units: PackingUnit[]): ParcelPlan {
    const bags = chooseBags(units)

    const boxes: Array<{ dimensions: Packaging; costCents: number }> = []
    for (const unit of units) {
        const packaging = unit.product.packaging
        if (packaging.type !== 'box') continue

        for (let index = 0; index < unit.quantity; index++) {
            boxes.push({
                dimensions: packaging.dimensions,
                costCents: packaging.packagingCents,
            })
        }
    }

    const components = [
        ...bags.map((bag) => bag.dimensions),
        ...boxes.map((box) => box.dimensions),
    ]

    if (components.length === 0) {
        // Nothing to ship, but Australia Post still needs a parcel to price.
        return {
            parcel: BAG_SIZES[0]!.dimensions,
            packagingCents: 0,
            description: 'no packaging',
        }
    }

    const totalVolume = components.reduce(
        (sum, component) => sum + volumeOf(component),
        0,
    )

    const widest = components.reduce((largest, component) =>
        footprintOf(component) > footprintOf(largest) ? component : largest,
    )
    const tallest = Math.max(...components.map((component) => component.height))

    const height = Math.max(tallest, totalVolume / footprintOf(widest))

    const packagingCents =
        bags.reduce((sum, bag) => sum + bag.costCents, 0) +
        boxes.reduce((sum, box) => sum + box.costCents, 0)

    return {
        parcel: {
            length: widest.length,
            width: widest.width,
            // Australia Post takes whole centimetres; rounding up keeps the
            // quote from describing a parcel smaller than the one we send.
            height: Math.ceil(height),
        },
        packagingCents,
        description: describePackaging(bags, boxes.length),
    }
}

function describePackaging(bags: BagSize[], boxCount: number): string {
    const parts: string[] = []

    const bySize = new Map<string, number>()
    for (const bag of bags) {
        bySize.set(bag.size, (bySize.get(bag.size) ?? 0) + 1)
    }
    for (const [size, count] of bySize) {
        parts.push(`${count} ${size} satchel${count === 1 ? '' : 's'}`)
    }

    if (boxCount > 0) {
        parts.push(`${boxCount} box${boxCount === 1 ? '' : 'es'}`)
    }

    return parts.join(', ')
}
