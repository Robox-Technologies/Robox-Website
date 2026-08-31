import type { Stripe } from 'stripe'

import type { OrderItem } from '@/features/emails/components/OrderSummary'
import { resolveBilling } from '@/utils/server/stripe/resolveBilling.server'
import { formatMoney } from '@/utils/formatPrice'

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

    const items: OrderItem[] = (session.line_items?.data ?? []).map((line) => ({
        // `description` is the line's display name; it falls back to the price
        // nickname, so it is what the customer saw in their summary.
        name: line.description ?? 'Item',
        quantity: line.quantity ?? 1,
        subtotal: money(line.amount_total),
    }))

    // A zero discount is the normal case, not a discount of nothing - only show
    // the row when one actually applied.
    const discountMinor = session.total_details?.amount_discount ?? 0

    // The service the customer chose. Only present when the rate was expanded,
    // so the summary falls back to a plain "Shipping" rather than an empty row.
    const shippingRate = session.shipping_cost?.shipping_rate
    const shippingMethod =
        shippingRate && typeof shippingRate !== 'string'
            ? (shippingRate.display_name ?? undefined)
            : undefined

    return {
        to: session.customer_details?.email ?? '',
        name: name || 'Customer',
        date,
        // The PaymentIntent id is what shows against the payment in Stripe and
        // on the customer's bank statement; the session id means nothing to
        // them. Falls back to the session for an order that never got that far.
        orderId: paymentIntentId ?? session.id,
        items,
        shipping: money(session.shipping_cost?.amount_total ?? 0),
        shippingMethod,
        discount: discountMinor > 0 ? money(discountMinor) : undefined,
        total: money(session.amount_total ?? 0),
        address,
        billing,
    }
}
