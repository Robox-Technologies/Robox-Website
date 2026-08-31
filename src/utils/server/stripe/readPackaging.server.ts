import type { Stripe } from 'stripe'
import type { BagCapacity, Packaging, ProductPackaging } from '@/types/shop'

/**
 * What a product's packaging metadata looks like, and what happens when it is
 * absent.
 *
 * The V1 kits ship in padded satchels and predate these keys, so a product
 * without `packagingType` is read as a bagged product with the capacities the
 * old `fees.json` brackets encoded (1 per small, 3 per medium, 10 per large).
 * That keeps the current catalog quoting correctly instead of failing the build,
 * but it is a compatibility shim - set the keys explicitly on every product.
 *
 * @see docs/packaging.md
 */
const LEGACY_BAG_CAPACITY: BagCapacity = { small: 1, medium: 3, large: 10 }

function parseInteger(
    value: string | undefined,
    { key, productName }: { key: string; productName: string },
): number {
    const parsed = Number(value)
    if (!Number.isInteger(parsed) || parsed <= 0) {
        throw new Error(
            `Invalid ${key} for product ${productName}: expected a positive whole number, got ${String(value)}`,
        )
    }
    return parsed
}

/**
 * `boxDimensions` is a single `LxWxH` string in centimetres - "24x16x8" - so a
 * box is one field to read and edit in the dashboard rather than three that can
 * disagree.
 */
function parseBoxDimensions(
    value: string | undefined,
    productName: string,
): Packaging {
    const parts = (value ?? '').toLowerCase().split('x')
    if (parts.length !== 3) {
        throw new Error(
            `Invalid boxDimensions for product ${productName}: expected "LxWxH" in cm, got ${String(value)}`,
        )
    }

    const [length, width, height] = parts.map((part) => Number(part.trim()))
    for (const dimension of [length, width, height]) {
        if (
            !Number.isFinite(dimension) ||
            dimension === undefined ||
            dimension <= 0
        ) {
            throw new Error(
                `Invalid boxDimensions for product ${productName}: every dimension must be a positive number, got ${String(value)}`,
            )
        }
    }

    return { length: length!, width: width!, height: height! }
}

/**
 * A capacity of 0 means "does not fit this size", which is recorded as null so
 * the packing code never divides by it.
 */
function parseCapacity(
    value: string | undefined,
    { key, productName }: { key: string; productName: string },
): number | null {
    if (value === undefined) return null

    const parsed = Number(value)
    if (!Number.isInteger(parsed) || parsed < 0) {
        throw new Error(
            `Invalid ${key} for product ${productName}: expected a whole number of items, got ${value}`,
        )
    }
    return parsed === 0 ? null : parsed
}

export function readPackaging(
    metadata: Stripe.Metadata,
    productName: string,
): ProductPackaging {
    const declared = metadata.packagingType?.trim().toLowerCase()

    if (declared === 'box') {
        return {
            type: 'box',
            dimensions: parseBoxDimensions(metadata.boxDimensions, productName),
            packagingCents: parseInteger(metadata.boxPackagingCents, {
                key: 'boxPackagingCents',
                productName,
            }),
        }
    }

    if (declared !== undefined && declared !== 'bag') {
        throw new Error(
            `Invalid packagingType for product ${productName}: expected "box" or "bag", got ${declared}`,
        )
    }

    const hasCapacities =
        metadata.bagCapacitySmall !== undefined ||
        metadata.bagCapacityMedium !== undefined ||
        metadata.bagCapacityLarge !== undefined

    if (!hasCapacities) {
        // Loud rather than silent: a product falling back is being quoted on a
        // guess, and for a bundle the guess is wrong in the expensive
        // direction - it will be packed as one item rather than as its
        // contents. See docs/packaging.md for the keys to set.
        console.warn(
            `[packaging] ${productName} has no bagCapacity metadata; assuming ${LEGACY_BAG_CAPACITY.small}/${LEGACY_BAG_CAPACITY.medium}/${LEGACY_BAG_CAPACITY.large} per small/medium/large satchel`,
        )
        return { type: 'bag', capacity: LEGACY_BAG_CAPACITY }
    }

    return {
        type: 'bag',
        capacity: {
            small: parseCapacity(metadata.bagCapacitySmall, {
                key: 'bagCapacitySmall',
                productName,
            }),
            medium: parseCapacity(metadata.bagCapacityMedium, {
                key: 'bagCapacityMedium',
                productName,
            }),
            large: parseCapacity(metadata.bagCapacityLarge, {
                key: 'bagCapacityLarge',
                productName,
            }),
        },
    }
}

/**
 * A bundle's constituents, keyed by Stripe product id. Absent for anything that
 * ships as itself.
 */
export function readCombo(
    metadata: Stripe.Metadata,
    productName: string,
): Record<string, number> | null {
    const raw = metadata.combo?.trim()
    if (!raw) return null

    let parsed: unknown
    try {
        parsed = JSON.parse(raw)
    } catch {
        throw new Error(
            `Invalid combo for product ${productName}: expected JSON like {"prod_123": 10}`,
        )
    }

    if (
        typeof parsed !== 'object' ||
        parsed === null ||
        Array.isArray(parsed)
    ) {
        throw new Error(
            `Invalid combo for product ${productName}: expected a JSON object of product id to quantity`,
        )
    }

    const combo: Record<string, number> = {}
    for (const [productId, quantity] of Object.entries(parsed)) {
        const count = Number(quantity)
        if (!Number.isInteger(count) || count <= 0) {
            throw new Error(
                `Invalid combo for product ${productName}: ${productId} must map to a positive whole number, got ${String(quantity)}`,
            )
        }
        combo[productId] = count
    }

    return Object.keys(combo).length > 0 ? combo : null
}
