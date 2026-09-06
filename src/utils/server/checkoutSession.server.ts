import { createHash, randomUUID } from 'node:crypto'
import { ActionError, type ActionAPIContext } from 'astro:actions'

/**
 * Ties a Checkout Session to the browser that created it. Session ids aren't secret —
 * Stripe puts them in the return URL — so endpoints need an ownership check. The owner is
 * a random httpOnly cookie; only its SHA-256 goes into the intent's metadata.
 */

const COOKIE_NAME = 'robox_checkout'

/** Long enough to outlast a slow checkout, short enough not to linger. */
const COOKIE_MAX_AGE_SECONDS = 60 * 60 * 12

/** Metadata key holding the owner fingerprint. */
export const CHECKOUT_OWNER_KEY = 'checkoutOwner'

function fingerprint(token: string): string {
    return createHash('sha256').update(token).digest('hex')
}

/** The caller's fingerprint, minting the cookie if they have none. */
export function resolveCheckoutOwner(context: ActionAPIContext): string {
    const existing = context.cookies.get(COOKIE_NAME)?.value
    if (existing) return fingerprint(existing)

    const token = randomUUID()

    context.cookies.set(COOKIE_NAME, token, {
        httpOnly: true,
        // 'lax': the customer returns from Stripe through a cross-site redirect, which
        // 'strict' would withhold the cookie on.
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
 * Fails closed: an order with no recorded owner counts as not ours. Takes anything with
 * metadata, so it covers both the session and the PaymentIntent.
 */
export function assertCheckoutOwner(
    subject: { metadata?: Record<string, string> | null },
    owner: string | null,
): asserts owner is string {
    const recorded = subject.metadata?.[CHECKOUT_OWNER_KEY]

    if (!owner || !recorded || recorded !== owner) {
        throw new ActionError({
            code: 'FORBIDDEN',
            message: 'This order belongs to a different checkout session.',
        })
    }
}
