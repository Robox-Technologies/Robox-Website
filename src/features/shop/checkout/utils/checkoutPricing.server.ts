import { getAllProducts } from '@/utils/server/stripe/getAllProducts.server'
import type { CartItems } from '@/features/shop/cart/types/cart'
import type { Packaging } from '@/types/shop'
import { DEFAULT_PACKAGING } from '@/utils/server/stripe/readPrice.server'
import { calculateAuspostShippingCents } from './auspost.server'
import { applyShippingSurcharge } from './shippingCost.server'
import {
    calculateDiscountCents,
    resolveDiscount,
    type DiscountStatus,
} from './discount.server'

const MIN_CHARGE_CENTS = 50
const DOMESTIC_COUNTRY_CODE = 'AU'

export type ShippingInfo = {
    country: string
    postcode: string
}

export type CheckoutTotals = {
    subtotalCents: number
    shippingCents: number
    discountCents: number
    discountStatus: DiscountStatus
    totalCents: number
}

export type ResolvedEntry = {
    itemId: string
    packaging: Packaging
    /** Stripe Price id, so a Checkout Session can name the price rather than an amount. */
    priceId: string
    quantity: number
    unitPriceCents: number
    weight: number
    unitVolume: number
}

type CartLike = Record<string, number> | CartItems

function sanitizeCart(
    cart: CartLike,
): Array<{ productKey: string; quantity: number }> {
    return Object.entries(cart)
        .map(([productKey, value]) => ({
            productKey,
            quantity:
                typeof value === 'number'
                    ? Number.isFinite(value)
                        ? Math.floor(value)
                        : 0
                    : Number.isFinite(value.quantity)
                      ? Math.floor(value.quantity)
                      : 0,
        }))
        .filter((entry) => entry.quantity > 0)
}

async function resolveEntries(cart: CartLike): Promise<ResolvedEntry[]> {
    const allProducts = await getAllProducts()

    const byInternalName = new Map(
        allProducts.map((product) => [product.internalName, product]),
    )
    const byItemId = new Map(
        allProducts.map((product) => [product.item_id, product]),
    )

    const sanitized = sanitizeCart(cart)
    if (sanitized.length === 0) {
        throw new Error('At least one product is required')
    }

    return sanitized.map(({ productKey, quantity }) => {
        const product =
            byInternalName.get(productKey) ?? byItemId.get(productKey)

        if (!product) {
            throw new Error(`Unknown product ${productKey}`)
        }

        if (product.status === 'not-available') {
            throw new Error(`Product ${product.internalName} is unavailable`)
        }

        return {
            itemId: product.item_id,
            priceId: product.priceId,
            quantity,
            unitPriceCents: product.price,
            weight: product.weight,
            unitVolume: product.unitVolume,
            packaging: product.packaging,
        }
    })
}

export async function calculateCheckoutTotals(
    cart: CartLike,
    shippingInfo?: ShippingInfo | null,
    voucher?: string | null,
): Promise<CheckoutTotals> {
    const entries = await resolveEntries(cart)

    const subtotalCents = entries.reduce(
        (sum, entry) => sum + entry.unitPriceCents * entry.quantity,
        0,
    )

    let shippingCents = 0
    if (shippingInfo) {
        const country = shippingInfo.country.trim().toUpperCase()
        const postcode = shippingInfo.postcode.trim()
        const requiresPostcode = country === DOMESTIC_COUNTRY_CODE

        if (!country) {
            throw new Error('Country is required when requesting shipping')
        }

        if (requiresPostcode && !postcode) {
            throw new Error('Postcode is required for domestic shipping')
        }

        const totalWeightGrams = entries.reduce(
            (sum, entry) => sum + entry.weight * entry.quantity,
            0,
        )
        shippingCents = applyShippingSurcharge(
            await calculateAuspostShippingCents({
                country,
                postcode,
                totalWeightGrams,
                parcel: resolveParcel(entries),
            }),
        )
    }

    const preDiscountTotalCents = subtotalCents + shippingCents

    // The discount comes off the post-shipping total, and is always resolved
    // here rather than trusted from the client — this is the amount charged.
    let discountCents = 0
    let discountStatus: DiscountStatus = 'unset'

    if (voucher?.trim()) {
        const discount = await resolveDiscount(voucher)

        if (!discount) {
            discountStatus = 'error'
        } else {
            discountCents = calculateDiscountCents({
                discount,
                lines: entries.map((entry) => ({
                    itemId: entry.itemId,
                    lineTotalCents: entry.unitPriceCents * entry.quantity,
                })),
                preDiscountTotalCents,
            })
            // Valid code that happens to take nothing off this cart.
            discountStatus = discountCents === 0 ? 'stale' : 'success'
        }
    }

    const totalCents = preDiscountTotalCents - discountCents

    if (totalCents < MIN_CHARGE_CENTS) {
        throw new Error('Validated total is below minimum charge amount')
    }

    return {
        subtotalCents,
        shippingCents,
        discountCents,
        discountStatus,
        totalCents,
    }
}

/**
 * One parcel big enough to hold the whole order.
 *
 * Each product carries its own box, so a single kit is quoted on a single kit's
 * dimensions rather than on a constant. For a mixed order the boxes are stacked:
 * the footprint is the largest of them and the heights add up. That over-states
 * an order whose items could sit side by side, which is the direction the error
 * should fall - Australia Post prices on dimensions, and a parcel quoted too
 * small costs us the difference.
 */
export function resolveParcel(entries: ResolvedEntry[]): Packaging {
    if (entries.length === 0) return DEFAULT_PACKAGING

    return entries.reduce<Packaging>(
        (parcel, entry) => ({
            length: Math.max(parcel.length, entry.packaging.length),
            width: Math.max(parcel.width, entry.packaging.width),
            height: parcel.height + entry.packaging.height * entry.quantity,
        }),
        { length: 0, width: 0, height: 0 },
    )
}

/**
 * The cart, validated against the live catalog. Exported so the Checkout
 * Session can be built from the same resolution the totals use - an amount and
 * a line item disagreeing about what is in the cart is the one failure this
 * whole module exists to prevent.
 */
export function resolveCartEntries(cart: CartLike): Promise<ResolvedEntry[]> {
    return resolveEntries(cart)
}

export async function normalizeCartMetadata(cart: CartLike): Promise<string> {
    const entries = await resolveEntries(cart)
    const products: Record<string, number> = {}
    for (const entry of entries) {
        products[entry.itemId] = entry.quantity
    }
    return JSON.stringify(products)
}

/** Stripe truncates metadata values past 500 characters. */
const METADATA_VALUE_LIMIT = 500

/**
 * The same cart written for a person rather than for code - "Ro/Box x 2,
 * Ro/Box 10-Pack x 1".
 *
 * `products` holds ids because that is what the receipt builder resolves
 * against the catalog, but an id tells you nothing when you are looking at a
 * payment in the Stripe dashboard. This is the line that does.
 */
export async function describeCartForHumans(cart: CartLike): Promise<string> {
    const entries = await resolveEntries(cart)
    const products = await getAllProducts()
    const byId = new Map(products.map((product) => [product.item_id, product]))

    const parts = entries.map((entry) => {
        const name = byId.get(entry.itemId)?.name ?? entry.itemId
        return `${name} x ${entry.quantity}`
    })

    const summary = parts.join(', ')
    return summary.length > METADATA_VALUE_LIMIT
        ? `${summary.slice(0, METADATA_VALUE_LIMIT - 1)}\u2026`
        : summary
}
