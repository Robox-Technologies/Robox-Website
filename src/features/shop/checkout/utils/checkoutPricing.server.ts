import { getAllProducts } from '@/utils/server/stripe/getAllProducts.server'
import type { CartItems } from '@/features/shop/cart/types/cart'
import type { Product } from '@/types/shop'
import {
    estimateFor,
    quoteShipmentServices,
    type DeliveryEstimateDays,
    type ShippingServiceId,
} from './auspost.server'
import {
    expandToPackingUnits,
    planShipment,
    type Shipment,
} from './packaging.server'
import { applyShippingSurcharge } from './shippingCost.server'

const MIN_CHARGE_CENTS = 50
const DOMESTIC_COUNTRY_CODE = 'AU'

export type ShippingInfo = {
    country: string
    postcode: string
}

/** One postage choice, priced for this cart and destination. */
export type ShippingOption = {
    id: ShippingServiceId
    label: string
    amountCents: number
    estimateDays: DeliveryEstimateDays
}

export type CheckoutTotals = {
    subtotalCents: number
    /** The cheapest option's postage; the service isn't chosen until the payment step. */
    shippingCents: number
    /** Every service Australia Post will carry, cheapest first. */
    shippingOptions: ShippingOption[]
    totalCents: number
    /** What is physically being sent, recorded on the payment. */
    shipment: Shipment | null
}

export type ResolvedEntry = {
    itemId: string
    /** Stripe Price id, so a Checkout Session can name the price rather than an amount. */
    priceId: string
    quantity: number
    unitPriceCents: number
    weight: number
    /** The catalog entry, so packing can read its packaging and combo. */
    product: Product
}

type CartLike = Record<string, number> | CartItems

/** A cart quantity in either shape the client sends. Non-finite values become 0. */
function readQuantity(value: number | { quantity: number }): number {
    const quantity = typeof value === 'number' ? value : value.quantity
    return Number.isFinite(quantity) ? Math.floor(quantity) : 0
}

function sanitizeCart(
    cart: CartLike,
): Array<{ productKey: string; quantity: number }> {
    return Object.entries(cart)
        .map(([productKey, value]) => ({
            productKey,
            quantity: readQuantity(value),
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
            product,
        }
    })
}

export async function calculateCheckoutTotals(
    cart: CartLike,
    shippingInfo?: ShippingInfo | null,
): Promise<CheckoutTotals> {
    const entries = await resolveEntries(cart)

    const subtotalCents = entries.reduce(
        (sum, entry) => sum + entry.unitPriceCents * entry.quantity,
        0,
    )

    let shippingCents = 0
    let shippingOptions: ShippingOption[] = []
    let shipment: Shipment | null = null
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

        const catalogById = new Map(
            (await getAllProducts()).map((product) => [
                product.item_id,
                product,
            ]),
        )
        const plan = planShipment(
            expandToPackingUnits(
                entries.map((entry) => ({
                    product: entry.product,
                    quantity: entry.quantity,
                })),
                catalogById,
            ),
        )

        const quotes = await quoteShipmentServices(
            { country, postcode },
            plan.parcels,
        )

        shippingOptions = quotes.map((quote) => ({
            id: quote.service.id,
            label: quote.service.label,
            // Per option, so the rounding lands on the figure the customer is charged.
            amountCents: applyShippingSurcharge(
                quote.auspostCents,
                plan.packagingCents,
            ),
            estimateDays: estimateFor(quote.service, country),
        }))

        shippingCents = shippingOptions[0]!.amountCents
        shipment = plan
    }

    // Discounts are Stripe's: a promotion code re-prices the Checkout Session.
    const totalCents = subtotalCents + shippingCents

    if (totalCents < MIN_CHARGE_CENTS) {
        throw new Error('Validated total is below minimum charge amount')
    }

    return {
        subtotalCents,
        shippingCents,
        shippingOptions,
        shipment,
        totalCents,
    }
}

/** The cart validated against the live catalog. Shared with the Checkout Session builder. */
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

/** The cart as a readable line for the Stripe dashboard: "Ro/Box x 2, Ro/Box 10-Pack x 1". */
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
