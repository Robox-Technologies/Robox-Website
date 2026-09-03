import type { Stripe } from 'stripe'
import type { BagCapacity, Packaging, ProductPackaging } from '@/types/shop'

/**
 * A product's packaging metadata. A product without `packagingType` falls back to the
 * old `fees.json` bag brackets — a shim for the V1 kits, not something to rely on.
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

/** `boxDimensions` is one `LxWxH` string in centimetres, e.g. "24x16x8". */
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

/** A capacity of 0 means it doesn't fit, recorded as null so nothing divides by it. */
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
    /** A bundle is expanded before packing, so its own packaging is never consulted. */
    { isBundle = false }: { isBundle?: boolean } = {},
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
        // A product on the fallback is being quoted on a guess. See docs/packaging.md.
        if (!isBundle) {
            console.warn(
                `[packaging] ${productName} has no bagCapacity metadata; assuming ${LEGACY_BAG_CAPACITY.small}/${LEGACY_BAG_CAPACITY.medium}/${LEGACY_BAG_CAPACITY.large} per small/medium/large satchel`,
            )
        }
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
