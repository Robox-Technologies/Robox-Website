import { atom } from 'nanostores'

export type ShippingAddress = {
    country: string
    postcode: string
}

export type ShippingQuote = {
    subtotal: number
    shipping: number
    total: number
    currency: 'aud'
}

export const shippingAddress = atom<ShippingAddress | null>(null)
export const shippingQuote = atom<ShippingQuote | null>(null)