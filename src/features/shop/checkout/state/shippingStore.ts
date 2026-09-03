import { atom, computed } from 'nanostores'
import { shippingDetails } from './checkoutStore'

export type ShippingAddress = {
    country: string
    postcode: string
}

export type ShippingQuoteOption = {
    id: string
    label: string
    amountCents: number
    estimateDays: { minimum: number; maximum: number }
}

export type ShippingQuote = {
    subtotal: number
    /** The cheapest option; the choice itself is made on the payment step. */
    shipping: number
    options: ShippingQuoteOption[]
    total: number
    currency: 'aud'
}

/** The two fields a postage quote keys on. Computed, so an address only enters the checkout once. */
export const shippingAddress = computed(
    shippingDetails,
    (details): ShippingAddress | null => {
        if (!details) return null
        return {
            country: details.address.country,
            postcode: details.address.postal_code,
        }
    },
)

export const shippingQuote = atom<ShippingQuote | null>(null)
