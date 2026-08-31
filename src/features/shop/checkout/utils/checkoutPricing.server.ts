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

/** One postage choice, priced for this cart and destination. */
export type ShippingOption = {
    id: ShippingServiceId
    label: string
    amountCents: number
    estimateDays: DeliveryEstimateDays
}

export type CheckoutTotals = {
    subtotalCents: number
    /**
     * The cheapest option's postage. The customer picks a service on the
     * payment step, against the Checkout Session - before that there is nothing
     * to have chosen, so totals quote the cheapest and the summary says "from".
     */
    shippingCents: number
    /** Every service Australia Post will carry, cheapest first. */
    shippingOptions: ShippingOption[]
    discountCents: number
    discountStatus: DiscountStatus
    totalCents: number
    /**
     * What is physically being sent. Recorded on the payment so an Australia
     * Post consignment can be raised from the order without re-deriving it.
     */
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
            product,
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
            // Packaging is added per option: the box costs the same however
            // fast it travels, and the rounding has to land on the figure the
            // customer is actually charged.
            amountCents: applyShippingSurcharge(
                quote.auspostCents,
                plan.packagingCents,
            ),
            estimateDays: estimateFor(quote.service, country),
        }))

        shippingCents = shippingOptions[0]!.amountCents
        shipment = plan
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
        shippingOptions,
        discountCents,
        discountStatus,
        shipment,
        totalCents,
    }
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
