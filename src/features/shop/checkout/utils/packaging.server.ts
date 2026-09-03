import type { BagCapacity, Packaging, Product } from '@/types/shop'

/** The satchels the shop stocks, smallest first. Dimensions in cm, cost in cents. */
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
 * Australia Post's limits for a single domestic parcel.
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

/** Guards against a bundle that contains itself. */
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
    /** What to reach for, e.g. "large satchel". */
    label: string
    dimensions: Packaging
    weightGrams: number
    packagingCents: number
    /** What goes inside. */
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
 * Expands bundles into the products they're packed as. The bundle's own weight is
 * split across the units it expands to, so the order total stays what the cart says.
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

/** Fraction of one satchel an item takes up, or null if it doesn't fit that size. */
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
 * Packs the bagged part of an order into satchels: the smallest single size that
 * holds it all, else large satchels filled one at a time.
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

    // Heaviest and bulkiest first, so part-full satchels get topped up with small items.
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

/** Throws on a parcel that exceeds Australia Post's limits and can't be split further. */
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

/** Turns an order into the parcels it ships as; each satchel and carton is quoted separately. */
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

/** Stripe caps metadata at 50 keys, so per-parcel lines stop here. */
const MAX_LISTED_PARCELS = 20

/** Separator between the four fields of a `parcelN` line. */
const PARCEL_FIELD_SEPARATOR = ' | '

function formatParcelLine(parcel: Parcel): string {
    const contents = parcel.contents
        .map((entry) => `${entry.quantity}x ${entry.name}`)
        .join(' + ')
    const { length, width, height } = parcel.dimensions

    return [
        parcel.label,
        contents,
        `${length}x${width}x${height}cm`,
        `${parcel.weightGrams}g`,
    ].join(PARCEL_FIELD_SEPARATOR)
}

/** The shipment flattened into metadata's string-only values, one key per parcel. */
export function shipmentToMetadata(shipment: Shipment): Record<string, string> {
    const metadata: Record<string, string> = {
        weightGrams: shipment.weightGrams.toString(),
        packagingCents: shipment.packagingCents.toString(),
        packaging: shipment.description,
        parcelCount: shipment.parcels.length.toString(),
    }

    shipment.parcels.slice(0, MAX_LISTED_PARCELS).forEach((parcel, index) => {
        metadata[`parcel${index + 1}`] = formatParcelLine(parcel)
    })

    return metadata
}

/** One parcel as it reads back out of metadata, already formatted for display. */
export type ParcelSummary = {
    /** What to reach for, e.g. "large satchel". */
    label: string
    /** What goes inside, e.g. "10x Ro/Box Kit". */
    contents: string
    /** e.g. "48.5x36x5cm". */
    dimensions: string
    /** e.g. "2000g". */
    weight: string
}

export type ShipmentSummary = {
    /** Readable summary, e.g. "2 large satchels, 1 box". */
    description: string
    parcels: ParcelSummary[]
    /** Total shipment weight, or null when the metadata didn't carry one. */
    weightGrams: number | null
    /** Parcels beyond `MAX_LISTED_PARCELS`, so a packing list can say some are missing. */
    unlistedParcels: number
}

/** Reads a `parcelN` line back, anchored on the outer fields so a name may contain the separator. */
function parseParcelLine(line: string): ParcelSummary | null {
    const parts = line.split(PARCEL_FIELD_SEPARATOR)
    if (parts.length < 4) return null

    return {
        label: parts[0]!,
        contents: parts.slice(1, -2).join(PARCEL_FIELD_SEPARATOR),
        dimensions: parts[parts.length - 2]!,
        weight: parts[parts.length - 1]!,
    }
}

/**
 * Inverse of `shipmentToMetadata`. The metadata is the only record of how an order
 * was packed. Null when the payment carries no shipment at all.
 */
export function parseShipmentMetadata(
    metadata: Record<string, string> | null | undefined,
): ShipmentSummary | null {
    if (!metadata) return null

    const parcels: ParcelSummary[] = []
    for (let index = 1; index <= MAX_LISTED_PARCELS; index++) {
        const line = metadata[`parcel${index}`]
        if (!line) break

        const parcel = parseParcelLine(line)
        if (parcel) parcels.push(parcel)
    }

    const description = metadata.packaging
    if (parcels.length === 0 && !description) return null

    const parcelCount = Number.parseInt(metadata.parcelCount ?? '', 10)
    const weightGrams = Number.parseInt(metadata.weightGrams ?? '', 10)

    return {
        description: description ?? '',
        parcels,
        weightGrams: Number.isFinite(weightGrams) ? weightGrams : null,
        unlistedParcels: Number.isFinite(parcelCount)
            ? Math.max(0, parcelCount - parcels.length)
            : 0,
    }
}
