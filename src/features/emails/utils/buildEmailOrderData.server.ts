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
    /**
     * How the order was packed, read back off the PaymentIntent metadata the
     * checkout wrote. Null for an order that carries none - one placed before
     * the metadata existed, or one whose shipment could not be planned.
     *
     * Only the internal email shows this; the customer has no use for it.
     */
    packing: PackingSummary | null
    /**
     * Whether the payment was taken in Stripe's sandbox, i.e. from localhost or
     * the dev site. The internal email says so in its subject so a test order
     * is never mistaken for one to pack.
     */
    testMode: boolean
}

/**
 * The packing plan the checkout recorded on the PaymentIntent, in the shape the
 * internal email renders.
 *
 * The metadata is the only surviving record of it - the shipment is planned
 * when the session is created and stored nowhere else - so this reads it back
 * rather than re-planning from the cart, which could land on a different answer
 * than the postage was quoted on.
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
 *
 * Everything comes off the session, which is the same object the customer's
 * summary was drawn from - so the receipt cannot disagree with what they saw.
 * That replaces reading amounts out of PaymentIntent metadata and re-resolving
 * product names against the catalog: `line_items` already carries the name and
 * the charged amount for each line, in the currency the order was presented in.
 *
 * Amounts are formatted with the session's own currency rather than assumed to
 * be AUD, so a receipt for a converted order reads in the currency the customer
 * actually paid.
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

    // Postage rides in as a line item so the wallets don't ask for an address
    // (see `createCheckoutSession`), which means it has to be told apart from
    // the things the customer actually ordered.
    const lines = session.line_items?.data ?? []

    // `isShippingLine` reads the product's marker metadata, which is only there
    // when the caller expanded `line_items.data.price.product`. Resolving the
    // id as well means a session loaded without that expansion still tells
    // postage apart - getting this wrong is silent and looked like a real
    // order: postage billed as an item called "Shipping", and the shipping row
    // itself charging nothing.
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
            // `amount_subtotal`, not `amount_total`: Stripe spreads a discount
            // across every line, so totals here would show the reduction a
            // second time alongside the discount row and the figures would not
            // add up.
            subtotal: money(line.amount_subtotal),
        }))

    // A zero discount is the normal case, not a discount of nothing - only show
    // the row when one actually applied.
    const discountMinor = session.total_details?.amount_discount ?? 0

    // The service the customer chose. Recorded on the intent when the session
    // was created, since the postage line item carries only an amount - the
    // summary falls back to a plain "Shipping" without it.
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
        // The PaymentIntent id is what shows against the payment in Stripe and
        // on the customer's bank statement; the session id means nothing to
        // them. Falls back to the session for an order that never got that far.
        orderId: paymentIntentId ?? session.id,
        items,
        // Falls back to `shipping_cost` for orders placed before postage
        // became a line item, so re-sending an old receipt still shows what was
        // charged rather than zero.
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
        // `livemode` is Stripe's own word for which set of keys took the
        // payment, so this cannot drift from whichever environment actually
        // charged the card - unlike inferring it from a hostname or an env var.
        testMode: !session.livemode,
    }
}
