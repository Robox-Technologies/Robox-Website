import { createCheckoutSession } from '@/features/shop/checkout/actions/createCheckoutSession.server'
import { getCheckoutStatus } from '@/features/shop/checkout/actions/getCheckoutStatus.server'
import { getShippingQuote } from '@/features/shop/checkout/actions/getShippingQuote.server'

export const server = {
    createCheckoutSession,
    getCheckoutStatus,
    getShippingQuote,
}
