export const prerender = false
import type { APIRoute } from 'astro'
import { Stripe } from 'stripe'
import { stripeAPI } from '@/utils/server/stripe/index.server'
import { sendOrderEmail } from '@/features/emails/utils/sendOrderEmail.server'

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

/**
 * The session, with everything the order emails read. Re-fetched rather than taken from
 * the event payload, which carries no expansions; `line_items.data.price.product` is
 * four levels deep, which is Stripe's cap.
 */
function loadSession(id: string): Promise<Stripe.Checkout.Session> {
    return stripeAPI.checkout.sessions.retrieve(id, {
        expand: [
            'line_items',
            'line_items.data.price.product',
            'payment_intent',
            'payment_intent.payment_method',
        ],
    })
}

/** A failed payment fires no `checkout.session.*` event, so find the session from the intent. */
async function findSessionForIntent(
    paymentIntentId: string,
): Promise<Stripe.Checkout.Session | null> {
    // Only the id: `data.line_items.data.price.product` is five levels, past Stripe's cap,
    // so `loadSession` re-reads it.
    const sessions = await stripeAPI.checkout.sessions.list({
        payment_intent: paymentIntentId,
        limit: 1,
    })

    const id = sessions.data[0]?.id
    return id ? await loadSession(id) : null
}

export const POST = (async ({ request }) => {
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

    console.log(`[stripe-webhook] ${event.type}`)

    // Everything below reaches out to Stripe, and this path is public — so it
    // only runs once the signature above has been verified.
    try {
        switch (event.type) {
            // Checkout finished. Delayed methods are closed out later by `async_payment_*`.
            case 'checkout.session.completed':
            case 'checkout.session.async_payment_succeeded': {
                const session = await loadSession(event.data.object.id)
                if (session.payment_status === 'unpaid') {
                    // A delayed method still clearing. Saying "thank you, it's
                    // paid" now would be wrong; the async event follows.
                    console.log(
                        '[stripe-webhook] session unpaid, awaiting async result',
                    )
                    break
                }
                await sendOrderEmail(session, true)
                break
            }

            case 'checkout.session.async_payment_failed': {
                await sendOrderEmail(
                    await loadSession(event.data.object.id),
                    false,
                )
                break
            }

            case 'payment_intent.payment_failed': {
                const session = await findSessionForIntent(event.data.object.id)
                if (!session) {
                    // Not one of ours, or an intent created outside checkout.
                    console.warn(
                        '[stripe-webhook] no session for failed intent',
                        event.data.object.id,
                    )
                    break
                }
                await sendOrderEmail(session, false)
                break
            }

            // An abandoned cart, 24 hours on. Nothing was charged and nothing
            // was promised, so there is nothing to tell the customer.
            case 'checkout.session.expired':
                break
        }
    } catch (error) {
        console.error('[stripe-webhook] error processing email:', error)
        // Fail so Stripe retries; it backs off and gives up, so this can't loop.
        return new Response('Error processing webhook', { status: 500 })
    }

    return new Response(null, { status: 200 })
}) satisfies APIRoute
