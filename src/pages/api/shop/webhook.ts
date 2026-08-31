export const prerender = false
import type { APIRoute } from 'astro'
import { Stripe } from 'stripe'
import { stripeAPI } from '@/utils/server/stripe/index.server'
import { sendOrderEmail } from '@/features/emails/utils/sendOrderEmail.server'
import { getAllProducts } from '@/utils/server/stripe/getAllProducts.server'
import type { Product } from '@/types/shop'

/**
 * The address on the order carries the recipient, but the email does not.
 *
 * `checkout.confirm()` takes no `receipt_email` — the customer's address is
 * collected by the Contact Details Element and lands on the Checkout Session,
 * not on the PaymentIntent. So when the intent has no email of its own, find
 * the session that created it and read it from there.
 */
async function resolveReceiptEmail(
    paymentIntent: Stripe.PaymentIntent,
): Promise<Stripe.PaymentIntent> {
    if (paymentIntent.receipt_email) return paymentIntent

    const sessions = await stripeAPI.checkout.sessions.list({
        payment_intent: paymentIntent.id,
        limit: 1,
    })
    const email = sessions.data[0]?.customer_details?.email

    if (!email) return paymentIntent

    // Returned as a copy rather than mutating Stripe's object, so the only
    // thing downstream sees changed is the field we filled in.
    return { ...paymentIntent, receipt_email: email }
}

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

export const POST = (async ({ request }) => {
    console.log('[stripe-webhook] received POST /api/shop/webhook')

    if (!endpointSecret) {
        console.error(
            '[stripe-webhook] STRIPE_WEBHOOK_SECRET is not configured',
        )
        return new Response('Stripe webhook secret not configured', {
            status: 500,
        })
    }

    const signature = request.headers.get('stripe-signature')
    let event: Stripe.Event
    try {
        if (!signature) {
            throw new Error('Stripe signature header not specified')
        }
        const body = await request.text()
        event = stripeAPI.webhooks.constructEvent(
            body,
            signature,
            endpointSecret,
        )
    } catch (err) {
        console.error(
            '[stripe-webhook] signature verification failed:',
            (err as Error).message,
        )
        return new Response('Webhook signature verification failed.', {
            status: 400,
        })
    }
    let paymentIntent: Stripe.PaymentIntent | null = null
    let succeeded = false

    switch (event.type) {
        case 'payment_intent.succeeded':
            succeeded = true
        case 'payment_intent.payment_failed':
            paymentIntent = event.data.object as Stripe.PaymentIntent
            break
    }

    if (paymentIntent) {
        try {
            // Deliberately after signature verification: this reaches out to
            // Stripe, and reading it up front meant an unsigned POST to this
            // public path could spend our API budget on its way to the 400.
            const allProducts = await getAllProducts()

            const verifiedProducts: Record<string, Product> =
                Object.fromEntries(
                    allProducts.map((product) => [product.item_id, product]),
                )

            await sendOrderEmail(
                await resolveReceiptEmail(paymentIntent),
                verifiedProducts,
                succeeded,
            )
        } catch (error) {
            console.error('[stripe-webhook] error processing email:', error)
        }
    }

    return new Response(null, { status: 200 })
}) satisfies APIRoute
