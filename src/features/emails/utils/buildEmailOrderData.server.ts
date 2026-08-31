import type { Stripe } from 'stripe'

import type { OrderItem } from '@/features/emails/components/OrderSummary'
import { resolveBilling } from '@/utils/server/stripe/resolveBilling.server'
import { formatMoney } from '@/utils/formatPrice'
import { SHIPPING_PRODUCT_MARKER } from '@/features/shop/checkout/utils/shippingLineItem'

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

    // Postage rides in as a line item so the wallets don't ask for an address
    // (see `createCheckoutSession`), which means it has to be told apart from
    // the things the customer actually ordered. Matched on the product's marker
    // metadata rather than its name, so renaming the product can't break this.
    const lines = session.line_items?.data ?? []
    const isPostage = (line: Stripe.LineItem) => {
        const product = line.price?.product
        if (!product || typeof product === 'string' || product.deleted) {
            return false
        }
        return (
            product.metadata?.[SHIPPING_PRODUCT_MARKER.key] ===
            SHIPPING_PRODUCT_MARKER.value
        )
    }

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
    }
}
