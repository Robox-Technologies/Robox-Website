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

/**
 * Australia Post's limits for a single domestic parcel. An order past any of
 * them is split across more parcels rather than refused.
 *
 * @see https://auspost.com.au/business/shipping/shipping-guidelines/size-weight-guidelines
 */
export const PARCEL_LIMITS = {
    /** Greatest linear dimension. */
    maxDimensionCm: 105,
    /** 0.25 m³. */
    maxVolumeCm3: 250_000,
    maxWeightGrams: 22_000,
    /** A box-shaped parcel must be at least this along its two smallest sides. */
    minBoxSideCm: 5,
}

/** A bundle containing itself would otherwise recurse until the stack gives out. */
const MAX_COMBO_DEPTH = 5

/** A product and how many of it are being packed, after bundles are expanded. */
export type PackingUnit = {
    product: Product
    quantity: number
    /** Total grams for all `quantity` of them. */
    weightGrams: number
}

/** One physical thing that gets a postage label. */
export type Parcel = {
    kind: 'satchel' | 'box'
    /** What to reach for: "large satchel" or "box". What goes in it is `contents`. */
    label: string
    dimensions: Packaging
    weightGrams: number
    packagingCents: number
    /** What goes inside, so the parcel can be picked without re-deriving it. */
    contents: Array<{ name: string; quantity: number }>
}

export type Shipment = {
    parcels: Parcel[]
    packagingCents: number
    weightGrams: number
    /** Readable summary, e.g. "2 large satchels, 1 box". */
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
 * The bundle's own `weight` is split across the units it expands to, in
 * proportion to how many there are. That keeps the order's total weight exactly
 * what the cart says it is - a bundle's weight already covers its contents, so
 * reading the constituents' own weights instead would both double-count and
 * depend on figures nobody maintains for products only ever sold in a bundle.
 */
export function expandToPackingUnits(
    lines: CartProductLine[],
    catalogById: Map<string, Product>,
): PackingUnit[] {
    const totals = new Map<string, PackingUnit>()

    const add = (
        product: Product,
        quantity: number,
        weightGrams: number,
        depth: number,
    ) => {
        if (depth > MAX_COMBO_DEPTH) {
            throw new Error(
                `Bundle nesting is too deep at product ${product.name} - check for a combo cycle`,
            )
        }

        const combo = product.combo
        if (combo) {
            const perBundle = Object.values(combo).reduce(
                (sum, count) => sum + count,
                0,
            )
            const totalChildren = perBundle * quantity

            for (const [productId, count] of Object.entries(combo)) {
                const constituent = catalogById.get(productId)
                if (!constituent) {
                    throw new Error(
                        `Product ${product.name} lists ${productId} in its combo, which is not in the catalog`,
                    )
                }

                const childQuantity = quantity * count
                add(
                    constituent,
                    childQuantity,
                    weightGrams * (childQuantity / totalChildren),
                    depth + 1,
                )
            }
            return
        }

        const existing = totals.get(product.item_id)
        if (existing) {
            existing.quantity += quantity
            existing.weightGrams += weightGrams
            return
        }
        totals.set(product.item_id, { product, quantity, weightGrams })
    }

    for (const line of lines) {
        add(line.product, line.quantity, line.product.weight * line.quantity, 0)
    }

    return [...totals.values()]
}

/** One physical item, so it can be assigned to a particular satchel. */
type BaggedItem = {
    product: Product
    capacity: BagCapacity
    weightGrams: number
}

function baggedItems(units: PackingUnit[]): BaggedItem[] {
    const items: BaggedItem[] = []

    for (const unit of units) {
        const packaging = unit.product.packaging
        if (packaging.type !== 'bag') continue

        const perItem = unit.weightGrams / unit.quantity
        for (let index = 0; index < unit.quantity; index++) {
            items.push({
                product: unit.product,
                capacity: packaging.capacity,
                weightGrams: perItem,
            })
        }
    }

    return items
}

/**
 * How much of one satchel of the given size an item takes up.
 *
 * A product that fits ten to a large satchel takes a tenth of it, so several
 * products can share one. `null` capacity means it doesn't fit that size at all.
 */
function share(item: BaggedItem, size: keyof BagCapacity): number {
    const capacity = item.capacity[size]
    return capacity === null ? Infinity : 1 / capacity
}

function summarise(items: BaggedItem[]): Array<{
    name: string
    quantity: number
}> {
    const counts = new Map<string, number>()
    for (const item of items) {
        counts.set(item.product.name, (counts.get(item.product.name) ?? 0) + 1)
    }
    return [...counts].map(([name, quantity]) => ({ name, quantity }))
}

function toSatchel(bag: BagSize, items: BaggedItem[]): Parcel {
    return {
        kind: 'satchel',
        label: `${bag.size} satchel`,
        dimensions: bag.dimensions,
        weightGrams: Math.ceil(
            items.reduce((sum, item) => sum + item.weightGrams, 0),
        ),
        packagingCents: bag.costCents,
        contents: summarise(items),
    }
}

/**
 * Packs the bagged part of an order into satchels.
 *
 * Everything in one satchel if it fits - the smallest size that holds it all.
 * Otherwise large satchels are filled one at a time, closing each when the next
 * item would overflow it either by bulk or by Australia Post's weight limit.
 */
function packSatchels(units: PackingUnit[]): Parcel[] {
    const items = baggedItems(units)
    if (items.length === 0) return []

    const totalWeight = items.reduce((sum, item) => sum + item.weightGrams, 0)

    for (const bag of BAG_SIZES) {
        const occupancy = items.reduce(
            (sum, item) => sum + share(item, bag.size),
            0,
        )
        if (occupancy <= 1 && totalWeight <= PARCEL_LIMITS.maxWeightGrams) {
            return [toSatchel(bag, items)]
        }
    }

    // Heaviest and bulkiest first, so a part-full satchel is filled with the
    // small items rather than leaving a big one stranded on its own.
    const ordered = [...items].sort(
        (a, b) =>
            share(b, LARGEST_BAG.size) - share(a, LARGEST_BAG.size) ||
            b.weightGrams - a.weightGrams,
    )

    const satchels: BaggedItem[][] = []
    let current: BaggedItem[] = []
    let occupancy = 0
    let weight = 0

    for (const item of ordered) {
        const itemShare = share(item, LARGEST_BAG.size)

        if (!Number.isFinite(itemShare)) {
            throw new Error(
                `Product ${item.product.name} does not fit any satchel size - it needs bagCapacity metadata or a box`,
            )
        }
        if (item.weightGrams > PARCEL_LIMITS.maxWeightGrams) {
            throw new Error(
                `Product ${item.product.name} is heavier than Australia Post's ${PARCEL_LIMITS.maxWeightGrams}g parcel limit on its own`,
            )
        }

        const overflows =
            occupancy + itemShare > 1 ||
            weight + item.weightGrams > PARCEL_LIMITS.maxWeightGrams

        if (current.length > 0 && overflows) {
            satchels.push(current)
            current = []
            occupancy = 0
            weight = 0
        }

        current.push(item)
        occupancy += itemShare
        weight += item.weightGrams
    }

    if (current.length > 0) satchels.push(current)

    return satchels.map((contents) => toSatchel(LARGEST_BAG, contents))
}

/** One carton per boxed item; cartons are not shared. */
function packBoxes(units: PackingUnit[]): Parcel[] {
    const parcels: Parcel[] = []

    for (const unit of units) {
        const packaging = unit.product.packaging
        if (packaging.type !== 'box') continue

        const perItem = unit.weightGrams / unit.quantity
        for (let index = 0; index < unit.quantity; index++) {
            parcels.push({
                kind: 'box',
                label: 'box',
                dimensions: packaging.dimensions,
                weightGrams: Math.ceil(perItem),
                packagingCents: packaging.packagingCents,
                contents: [{ name: unit.product.name, quantity: 1 }],
            })
        }
    }

    return parcels
}

/**
 * Australia Post rejects a parcel past any of its limits, so a parcel that
 * can't be split down further - a single carton, or one item too heavy for one
 * satchel - is a data problem and says so rather than being quoted and refused
 * at the counter.
 */
function assertShippable(parcel: Parcel): void {
    const { length, width, height } = parcel.dimensions
    const sides = [length, width, height]

    if (Math.max(...sides) > PARCEL_LIMITS.maxDimensionCm) {
        throw new Error(
            `${parcel.label} is ${Math.max(...sides)}cm along its longest side, past Australia Post's ${PARCEL_LIMITS.maxDimensionCm}cm limit`,
        )
    }

    const volume = length * width * height
    if (volume > PARCEL_LIMITS.maxVolumeCm3) {
        throw new Error(
            `${parcel.label} is ${(volume / 1_000_000).toFixed(3)}m³, past Australia Post's ${PARCEL_LIMITS.maxVolumeCm3 / 1_000_000}m³ limit`,
        )
    }

    if (parcel.weightGrams > PARCEL_LIMITS.maxWeightGrams) {
        throw new Error(
            `${parcel.label} weighs ${parcel.weightGrams}g, past Australia Post's ${PARCEL_LIMITS.maxWeightGrams}g limit`,
        )
    }

    if (
        parcel.kind === 'box' &&
        sides
            .sort((a, b) => a - b)
            .slice(0, 2)
            .some((side) => side < PARCEL_LIMITS.minBoxSideCm)
    ) {
        throw new Error(
            `${parcel.label} is thinner than Australia Post's ${PARCEL_LIMITS.minBoxSideCm}cm minimum on a box-shaped parcel`,
        )
    }
}

/**
 * Turns an order into the parcels it actually ships as.
 *
 * Each satchel and each carton is its own parcel, quoted separately and summed.
 * An earlier version merged them into one notional parcel by totalling volume,
 * which both described something that doesn't exist - you can't put a carton
 * inside a flat satchel - and undercharged, since two physical parcels are two
 * postages.
 */
export function planShipment(units: PackingUnit[]): Shipment {
    const parcels = [...packSatchels(units), ...packBoxes(units)]

    for (const parcel of parcels) {
        assertShippable(parcel)
    }

    return {
        parcels,
        packagingCents: parcels.reduce(
            (sum, parcel) => sum + parcel.packagingCents,
            0,
        ),
        weightGrams: parcels.reduce(
            (sum, parcel) => sum + parcel.weightGrams,
            0,
        ),
        description: describe(parcels),
    }
}

function describe(parcels: Parcel[]): string {
    if (parcels.length === 0) return 'no packaging'

    const counts = new Map<string, number>()
    for (const parcel of parcels) {
        counts.set(parcel.label, (counts.get(parcel.label) ?? 0) + 1)
    }

    return [...counts]
        .map(([label, count]) =>
            count === 1 ? `1 ${label}` : `${count} ${pluralise(label)}`,
        )
        .join(', ')
}

/** Enough for the two words this produces: "satchel" and "box". */
function pluralise(label: string): string {
    return label.endsWith('x') ? `${label}es` : `${label}s`
}

/**
 * Stripe caps a metadata value at 500 characters and an object at 50 keys, so
 * the per-parcel lines stop here. Well past any real order - it exists so a
 * freak cart can't push out the keys that matter.
 */
const MAX_LISTED_PARCELS = 20

/**
 * The shipment flattened into metadata's string-only values.
 *
 * One key per parcel, because this is what someone reads to pack the order: each
 * line says what to reach for, what goes in it, and what to declare.
 */
export function shipmentToMetadata(shipment: Shipment): Record<string, string> {
    const metadata: Record<string, string> = {
        weightGrams: shipment.weightGrams.toString(),
        packagingCents: shipment.packagingCents.toString(),
        packaging: shipment.description,
        parcelCount: shipment.parcels.length.toString(),
    }

    shipment.parcels.slice(0, MAX_LISTED_PARCELS).forEach((parcel, index) => {
        const contents = parcel.contents
            .map((entry) => `${entry.quantity}x ${entry.name}`)
            .join(' + ')
        const { length, width, height } = parcel.dimensions

        metadata[`parcel${index + 1}`] =
            `${parcel.label} | ${contents} | ${length}x${width}x${height}cm | ${parcel.weightGrams}g`
    })

    return metadata
}
