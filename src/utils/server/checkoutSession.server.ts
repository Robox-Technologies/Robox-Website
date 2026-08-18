import { createHash, randomUUID } from 'node:crypto'
import { ActionError, type ActionAPIContext } from 'astro:actions'
import type { Stripe } from 'stripe'

/**
 * Ties a PaymentIntent to the browser that created it.
 *
 * `updatePaymentIntent` takes an intent id from the client and rewrites that
 * intent's amount and line items. The id is not a secret — Stripe puts
 * `payment_intent=pi_...` in the return URL, so it lands in browser history,
 * access logs and any `Referer` sent to a third party — so without an ownership
 * check, anyone holding another customer's id could rewrite that customer's order
 * while it was still awaiting payment.
 *
 * The owner is a random token in an httpOnly cookie. What goes into the intent's
 * metadata is only its SHA-256, so the recorded value can't be replayed as the
 * cookie, and no server-side session store is needed — the binding survives a
 * restart because it lives on the intent.
 */

const COOKIE_NAME = 'robox_checkout'

/** Long enough to outlast a slow checkout, short enough not to linger. */
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 12

/** PaymentIntent metadata key holding the owner fingerprint. */
export const CHECKOUT_OWNER_KEY = 'checkoutOwner'

function fingerprint(token: string): string {
    return createHash('sha256').update(token).digest('hex')
}

/**
 * The caller's fingerprint, minting the cookie when they don't have one yet.
 *
 * Called from `createPaymentIntent`, whose response is what carries the
 * `Set-Cookie` back (the Node adapter renders actions with `addCookieHeader`).
 */
export function resolveCheckoutOwner(context: ActionAPIContext): string {
    const existing = context.cookies.get(COOKIE_NAME)?.value
    if (existing) return fingerprint(existing)

    const token = randomUUID()

    context.cookies.set(COOKIE_NAME, token, {
        httpOnly: true,
        // 'lax' rather than 'strict': the customer comes back from Stripe through
        // a top-level cross-site redirect, and 'strict' would withhold the cookie
        // on that navigation.
        sameSite: 'lax',
        // Only mark it Secure when the request actually is: dev runs on http.
        secure: context.url.protocol === 'https:',
        path: '/',
        maxAge: COOKIE_MAX_AGE_SECONDS,
    })

    return fingerprint(token)
}

/** The caller's fingerprint, or null when they have no checkout cookie yet. */
export function readCheckoutOwner(context: ActionAPIContext): string | null {
    const existing = context.cookies.get(COOKIE_NAME)?.value
    return existing ? fingerprint(existing) : null
}

/**
 * Fails closed: an intent carrying no owner — one created before this check
 * existed — counts as not ours to touch. `usePaymentID` answers a rejection by
 * abandoning the intent and creating a fresh one, so this costs a round trip
 * rather than a sale.
 */
export function assertCheckoutOwner(
    intent: Stripe.PaymentIntent,
    owner: string | null,
): asserts owner is string {
    const recorded = intent.metadata?.[CHECKOUT_OWNER_KEY]

    if (!owner || !recorded || recorded !== owner) {
        throw new ActionError({
            code: 'FORBIDDEN',
            message:
                'This payment intent belongs to a different checkout session.',
        })
    }
}
