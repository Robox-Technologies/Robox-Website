export const prerender = false
import type { APIRoute } from 'astro'
import { Stripe } from 'stripe'
import { stripeAPI } from '@/utils/server/stripe/index.server'
import { sendOrderEmail } from '@/features/emails/utils/sendOrderEmail.server'
import { getAllProducts } from '@/utils/server/stripe/getAllProducts.server'
import type { Product } from '@/types/shop'

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

            await sendOrderEmail(paymentIntent, verifiedProducts, succeeded)
        } catch (error) {
            console.error('[stripe-webhook] error processing email:', error)
        }
    }

    return new Response(null, { status: 200 })
}) satisfies APIRoute
