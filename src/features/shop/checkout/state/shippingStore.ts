import { atom } from 'nanostores'

export type ShippingAddress = {
    country: string
    postcode: string
}

export type DiscountStatus = 'unset' | 'success' | 'stale' | 'error'

export type ShippingQuote = {
    subtotal: number
    shipping: number
    discount: number
    discountStatus: DiscountStatus
    total: number
    currency: 'aud'
}

export const shippingAddress = atom<ShippingAddress | null>(null)
export const shippingQuote = atom<ShippingQuote | null>(null)

/**
 * The code the customer has actually submitted with Apply — not what they're
 * currently typing. Quotes and the payment intent both key off this, so it
 * only changes on an explicit action.
 */
export const voucherCode = atom<string>('')