import { getAllProducts } from '@/utils/server/stripe/getAllProducts.server'
import type { CartItems } from '@/features/shop/cart/types/cart'
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

type ResolvedEntry = {
    itemId: string
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
            quantity,
            unitPriceCents: product.price,
            weight: product.weight,
            unitVolume: product.unitVolume,
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
        const totalUnitVolume = entries.reduce(
            (sum, entry) => sum + entry.unitVolume * entry.quantity,
            0,
        )

        shippingCents = applyShippingSurcharge(
            await calculateAuspostShippingCents({
                country,
                postcode,
                totalWeightGrams,
                totalUnitVolume,
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

export async function normalizeCartMetadata(cart: CartLike): Promise<string> {
    const entries = await resolveEntries(cart)
    const products: Record<string, number> = {}
    for (const entry of entries) {
        products[entry.itemId] = entry.quantity
    }
    return JSON.stringify(products)
}
