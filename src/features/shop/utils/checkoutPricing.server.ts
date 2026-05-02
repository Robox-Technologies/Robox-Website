import { getAllProducts } from '@utils/server/stripe.server'
import { calculateAuspostShippingCents } from './auspost.server'

const MIN_CHARGE_CENTS = 50
const DOMESTIC_COUNTRY_CODE = 'AU'

export type ShippingInfo = {
    country: string
    postcode: string
}

export type CheckoutTotals = {
    subtotalCents: number
    shippingCents: number
    totalCents: number
}

type ResolvedEntry = {
    itemId: string
    quantity: number
    unitPriceCents: number
    weight: number
    unitVolume: number
}

function sanitizeCart(
    cart: Record<string, number>,
): Array<{ productKey: string; quantity: number }> {
    return Object.entries(cart)
        .map(([productKey, quantity]) => ({
            productKey,
            quantity: Number.isFinite(quantity) ? Math.floor(quantity) : 0,
        }))
        .filter((entry) => entry.quantity > 0)
}

async function resolveEntries(
    cart: Record<string, number>,
): Promise<ResolvedEntry[]> {
    const allProducts = await getAllProducts()

    const byInternalName = new Map(
        allProducts.map((product) => [product.internalName, product]),
    )
    const byItemId = new Map(allProducts.map((product) => [product.item_id, product]))

    const sanitized = sanitizeCart(cart)
    if (sanitized.length === 0) {
        throw new Error('At least one product is required')
    }

    return sanitized.map(({ productKey, quantity }) => {
        const product = byInternalName.get(productKey) ?? byItemId.get(productKey)

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
    cart: Record<string, number>,
    shippingInfo?: ShippingInfo | null,
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

        shippingCents = await calculateAuspostShippingCents({
            country,
            postcode,
            totalWeightGrams,
            totalUnitVolume,
        })
    }

    const totalCents = subtotalCents + shippingCents

    if (totalCents < MIN_CHARGE_CENTS) {
        throw new Error('Validated total is below minimum charge amount')
    }

    return {
        subtotalCents,
        shippingCents,
        totalCents,
    }
}

export async function normalizeCartMetadata(
    cart: Record<string, number>,
): Promise<string> {
    const entries = await resolveEntries(cart)
    return entries
        .map((entry) => `${entry.itemId}:${entry.quantity}`)
        .join(',')
}
