import { atom } from 'nanostores'

/**
 * Two steps, because the address must be known before the Checkout Session exists:
 * the session carries a fixed rate and no `shipping_address_collection`, which is what
 * keeps the wallets available alongside a per-postcode quote.
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

/** The delivery address, set only while Stripe reports the form `complete`. Not persisted. */
export const shippingDetails = atom<ShippingDetails | null>(null)

/** The delivery speed, settled before the session exists so it carries exactly one rate. */
export const shippingServiceId = atom<string>('standard')
