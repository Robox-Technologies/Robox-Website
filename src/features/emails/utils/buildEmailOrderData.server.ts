import type { Stripe } from 'stripe'

import type { OrderItem } from '@/features/emails/components/OrderSummary'
import type { PackingSummary } from '@/features/emails/components/PackingList'
import { resolveBilling } from '@/utils/server/stripe/resolveBilling.server'
import { formatMoney } from '@/utils/formatPrice'
import { isShippingLine } from '@/features/shop/checkout/utils/shippingLineItem'
import { resolveShippingProductId } from '@/utils/server/stripe/shippingProduct.server'
import { parseShipmentMetadata } from '@/features/shop/checkout/utils/packaging.server'

export interface EmailOrderData {
    to: string
    name: string
    date: string
    orderId: string
    items: OrderItem[]
    shipping: string
    shippingMethod?: string
    discount?: string
    total: string
    address: string
    billing: string
    /** How the order was packed, from the PaymentIntent metadata. Internal email only. */
    packing: PackingSummary | null
    /** Whether the payment was taken in Stripe's sandbox; the internal subject says so. */
    testMode: boolean
}

/**
 * The packing plan recorded on the PaymentIntent. Read back rather than re-planned,
 * since the metadata is the only record of what the postage was quoted on.
 */
function toPackingSummary(
    metadata: Stripe.Metadata | null | undefined,
): PackingSummary | null {
    const shipment = parseShipmentMetadata(metadata)
    if (!shipment) return null

    return {
        description: shipment.description,
        parcels: shipment.parcels,
        totalWeight:
            shipment.weightGrams === null
                ? undefined
                : `${shipment.weightGrams}g`,
        unlistedParcels: shipment.unlistedParcels,
    }
}

/**
 * Turns a completed Checkout Session into the strings the order emails render.
 * Everything comes off the session, in its own currency, so the receipt can't
 * disagree with the summary the customer saw.
 */
export async function buildEmailOrderData(
    session: Stripe.Checkout.Session,
): Promise<EmailOrderData> {
    const currency = session.currency ?? 'aud'
    const money = (minorUnits: number) =>
        formatMoney(minorUnits, currency, { forceCents: true })

    const { name, address, billing } = await resolveBilling(session)

    const date = new Date().toLocaleDateString('en-AU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    })

    const paymentIntentId =
        typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent?.id

    // Postage rides in as a line item (see `createCheckoutSession`), so it has to be
    // told apart from what the customer ordered.
    const lines = session.line_items?.data ?? []

    // `isShippingLine` needs `line_items.data.price.product` expanded; resolving the id
    // as well covers a session loaded without it.
    const shippingProductId = lines.some(
        (line) => typeof line.price?.product === 'string',
    )
        ? await resolveShippingProductId()
        : null

    const isPostage = (line: Stripe.LineItem) =>
        isShippingLine(line, shippingProductId)

    const postageLine = lines.find(isPostage)

    const items: OrderItem[] = lines
        .filter((line) => !isPostage(line))
        .map((line) => ({
            // `description` is the line's display name; it falls back to the
            // price nickname, so it is what the customer saw in their summary.
            name: line.description ?? 'Item',
            quantity: line.quantity ?? 1,
            // `amount_subtotal`: Stripe spreads a discount across lines, which would
            // double-count it against the discount row.
            subtotal: money(line.amount_subtotal),
        }))

    // A zero discount is the normal case, not a discount of nothing - only show
    // the row when one actually applied.
    const discountMinor = session.total_details?.amount_discount ?? 0

    // Recorded on the intent at session creation; the postage line item carries only an amount.
    const intent =
        typeof session.payment_intent === 'string'
            ? null
            : session.payment_intent
    const shippingMethod =
        intent?.metadata?.shippingService ||
        // Older orders carried the service on the shipping rate itself.
        (session.shipping_cost?.shipping_rate &&
        typeof session.shipping_cost.shipping_rate !== 'string'
            ? (session.shipping_cost.shipping_rate.display_name ?? undefined)
            : undefined)

    return {
        to: session.customer_details?.email ?? '',
        name: name || 'Customer',
        date,
        // The PaymentIntent id is what shows on the bank statement; the session id doesn't.
        orderId: paymentIntentId ?? session.id,
        items,
        // `shipping_cost` covers orders placed before postage became a line item.
        shipping: money(
            postageLine?.amount_subtotal ??
                session.shipping_cost?.amount_subtotal ??
                0,
        ),
        shippingMethod,
        discount: discountMinor > 0 ? money(discountMinor) : undefined,
        total: money(session.amount_total ?? 0),
        address,
        billing,
        packing: toPackingSummary(intent?.metadata),
        // `livemode` is which set of keys took the payment, so it can't drift from a hostname.
        testMode: !session.livemode,
    }
}
