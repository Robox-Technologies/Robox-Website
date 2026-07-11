import { createPaymentIntent } from '@/features/shop/checkout/actions/createPaymentIntent.server'
import { getShippingQuote } from '@/features/shop/checkout/actions/getShippingQuote.server'
import { updatePaymentIntent } from '@/features/shop/checkout/actions/updatePaymentIntent.server'

export const server = {
    createPaymentIntent,
    getShippingQuote,
    updatePaymentIntent,
}

