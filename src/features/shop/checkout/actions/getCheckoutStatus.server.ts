import { defineAction } from 'astro:actions'
import { z } from 'astro/zod'
import { stripeAPI } from '@/utils/server/stripe/index.server'
import { enforceRateLimit } from '@/utils/server/rateLimit.server'
import {
    CHECKOUT_OWNER_KEY,
    readCheckoutOwner,
} from '@/utils/server/checkoutSession.server'

export type CheckoutOutcome = 'processing' | 'succeeded' | 'failed' | 'expired'

/**
 * Reports how a Checkout Session ended, for the page Stripe returns the
 * customer to.
 *
 * The session id arrives in the return URL, so it is not a secret. The outcome
 * is harmless to hand back, but the customer's email is not - it is only
 * included when the caller's checkout cookie matches the session's recorded
 * owner. Someone who obtained a session id from a log or a `Referer` learns
 * whether it was paid, and nothing about who paid it.
 */
export const getCheckoutStatus = defineAction({
    input: z.object({
        sessionId: z.string().trim().min(1).max(200),
    }),
    async handler({ sessionId }, context) {
        enforceRateLimit(context, { name: 'getCheckoutStatus', max: 90 })

        const session = await stripeAPI.checkout.sessions.retrieve(sessionId, {
            expand: ['payment_intent'],
        })

        const owner = readCheckoutOwner(context)
        const isOwner =
            Boolean(owner) && session.metadata?.[CHECKOUT_OWNER_KEY] === owner

        const intent =
            typeof session.payment_intent === 'string'
                ? null
                : session.payment_intent

        let outcome: CheckoutOutcome
        if (session.status === 'expired') {
            outcome = 'expired'
        } else if (session.status === 'complete') {
            // `unpaid` on a complete session is a delayed payment method still
            // clearing, not a failure - the webhook finishes that by email.
            outcome =
                session.payment_status === 'paid' ||
                session.payment_status === 'no_payment_required'
                    ? 'succeeded'
                    : 'processing'
        } else if (intent?.status === 'succeeded') {
            outcome = 'succeeded'
        } else if (
            intent?.status === 'processing' ||
            intent?.status === 'requires_action'
        ) {
            outcome = 'processing'
        } else if (intent?.last_payment_error) {
            // Session still open with a failed attempt behind it: the customer
            // came back from a redirect that didn't go through. A hard decline
            // on a card never gets here - `confirm` reports that inline
            // without redirecting - so this is the redirect-method case.
            outcome = 'failed'
        } else {
            outcome = 'processing'
        }

        return {
            outcome,
            email: isOwner ? (session.customer_details?.email ?? null) : null,
        }
    },
})
