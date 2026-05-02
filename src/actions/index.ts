import { createPaymentIntent } from '@features/shop/actions/createPaymentIntent.server'
import { getShippingQuote } from '@features/shop/actions/getShippingQuote.server'

export const server = {
    createPaymentIntent,
    getShippingQuote,
}

