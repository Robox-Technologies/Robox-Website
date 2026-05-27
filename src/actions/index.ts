import { createPaymentIntent } from '@features/shop/actions/createPaymentIntent.server'
import { getShippingQuote } from '@features/shop/actions/getShippingQuote.server'
import { updatePaymentIntent } from '@features/shop/actions/updatePaymentIntent.server'

export const server = {
    createPaymentIntent,
    getShippingQuote,
    updatePaymentIntent,
}

