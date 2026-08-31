import { atom } from 'nanostores'

/**
 * The checkout runs as two steps rather than one page.
 *
 * The delivery address has to be known *before* the Checkout Session exists:
 * the session is created with the exact Australia Post rate already in
 * `shipping_options`, and with no `shipping_address_collection`, so that no
 * wallet is collecting an address of its own. That is what keeps Apple Pay and
 * Google Pay available alongside a per-postcode shipping quote — Stripe
 * disables those wallets whenever the server owns the shipping details.
 */
export type CheckoutStep = 'address' | 'payment'

export type ShippingDetails = {
    name: string
    address: {
        line1: string
        line2: string | null
        city: string
        state: string | null
        postal_code: string
        country: string
    }
}

export const checkoutStep = atom<CheckoutStep>('address')

/**
 * The delivery address, set only once Stripe reports the form `complete` and
 * cleared the moment it isn't - so a quote is never requested for a half-typed
 * address.
 *
 * Deliberately not persisted: a reload sends the customer back to the address
 * step, which is recoverable, whereas a stale address surviving a cart change
 * is not.
 */
export const shippingDetails = atom<ShippingDetails | null>(null)
