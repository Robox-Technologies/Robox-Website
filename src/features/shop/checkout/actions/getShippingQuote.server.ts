import { defineAction } from 'astro:actions'
import { z } from 'astro/zod'
import { calculateCheckoutTotals } from '../utils/checkoutPricing.server'

export const getShippingQuote = defineAction({
    input: z.object({
        products: z.record(
            z.string(),
            z.object({
                quantity: z.number().int().nonnegative(),
            }),
        ),
        shippingInfo: z.object({
            country: z.string().trim().min(2).max(2),
            postcode: z.string().trim().max(16),
        }),
    }),
    async handler({ products, shippingInfo }) {
        const totals = await calculateCheckoutTotals(products, shippingInfo)

        return {
            subtotal: totals.subtotalCents,
            shipping: totals.shippingCents,
            total: totals.totalCents,
            currency: 'aud' as const,
        }
    },
})
