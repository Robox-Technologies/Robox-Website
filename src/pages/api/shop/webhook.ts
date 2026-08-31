export const prerender = false
import type { APIRoute } from 'astro'
import { Stripe } from 'stripe'
import { stripeAPI } from '@/utils/server/stripe/index.server'
import { sendOrderEmail } from '@/features/emails/utils/sendOrderEmail.server'

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET

/**
 * The session, with everything the order emails read.
 *
 * Always re-fetched rather than taken from the event payload: the payload is
 * rendered at the endpoint's configured API version and carries no expansions,
 * so `line_items` — which is where the item names and charged amounts now come
 * from — would be missing.
 */
function loadSession(id: string): Promise<Stripe.Checkout.Session> {
    return stripeAPI.checkout.sessions.retrieve(id, {
        expand: [
            'line_items',
            'payment_intent',
            'payment_intent.payment_method',
        ],
    })
}

/**
 * A failed card payment never completes its session, so there is no
 * `checkout.session.*` event for it — the failure notice still has to hang off
 * `payment_intent.payment_failed`. The session exists regardless, so find it and
 * build the email from the same shape the success path uses.
 */
async function findSessionForIntent(
    paymentIntentId: string,
): Promise<Stripe.Checkout.Session | null> {
    const sessions = await stripeAPI.checkout.sessions.list({
        payment_intent: paymentIntentId,
        limit: 1,
        expand: [
            'data.line_items',
            'data.payment_intent',
            'data.payment_intent.payment_method',
            'data.shipping_cost.shipping_rate',
        ],
    })
    return sessions.data[0] ?? null
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
            // The customer finished checkout. For an immediate method the money
            // is already there; for a delayed one this is the order being
            // placed, and `async_payment_*` closes it out later.
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
        // Answer with a failure so Stripe retries. An order email that didn't
        // send is worth another attempt - a Resend outage is transient, and the
        // alternative is a customer who paid and heard nothing. Stripe backs
        // off and eventually gives up, so a permanently failing send can't loop.
        return new Response('Error processing webhook', { status: 500 })
    }

    return new Response(null, { status: 200 })
}) satisfies APIRoute
