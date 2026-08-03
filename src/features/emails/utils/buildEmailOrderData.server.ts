import type { EmailOrderData } from '@/utils/server/stripe/processPaymentIntent.server'
import { processPaymentIntent } from '@/utils/server/stripe/processPaymentIntent.server'
import type { Product } from '@/types/shop'
import { resolveBilling } from '@/utils/server/stripe/resolveBilling.server'
import { formatPrice } from '@/utils/formatPrice'
import type { OrderItem } from '@/features/emails/components/OrderSummary'
import { Stripe } from 'stripe'

/**
 * Reads a cents value out of PaymentIntent metadata, where everything is a
 * string. Returns 0 for anything missing or unparseable rather than letting
 * NaN reach `formatPrice`, which would render as "AU$NaN".
 */
function readCents(value: string | undefined): number {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
}

export async function buildEmailOrderData(
    paymentIntent: Stripe.PaymentIntent,
    verifiedProducts: Record<string, Product>,
): Promise<EmailOrderData> {
    const [to, products] = processPaymentIntent(paymentIntent, verifiedProducts)
    const { name, address, billing } = await resolveBilling(paymentIntent)

    const date = new Date().toLocaleDateString('en-AU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    })

    const orderId = paymentIntent.id
    const total = formatPrice(paymentIntent.amount, true)

    // Metadata keys are written by the checkout actions (createPaymentIntent /
    // updatePaymentIntent) and must stay in step with them.
    const shipping = formatPrice(readCents(paymentIntent.metadata.shippingCents), true)

    // A zero discount is the normal case, not a discount of nothing - only show
    // the row when one actually applied.
    const discountCents = readCents(paymentIntent.metadata.discountCents)
    const discount = discountCents > 0 ? formatPrice(discountCents, true) : undefined

    const items: OrderItem[] = Object.entries(products).map(
        ([productName, { quantity, price }]) => ({
            name: productName,
            quantity,
            subtotal: formatPrice(price, true),
        }),
    )

    return {
        to,
        name: name || 'Customer',
        date,
        orderId,
        items,
        shipping,
        discount,
        total,
        address,
        billing,
    }
}
