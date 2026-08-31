import { defineAction } from 'astro:actions'
import { z } from 'astro/zod'
import { enforceRateLimit } from '@/utils/server/rateLimit.server'
import { calculateCheckoutTotals } from '../utils/checkoutPricing.server'

export const getShippingQuote = defineAction({
    input: z.object({
        products: z.record(
            z.string(),
            z.object({
                quantity: z.number().int().nonnegative(),
            }),
        ),
        shippingInfo: z
            .object({
                country: z.string().trim().min(2).max(2),
                postcode: z.string().trim().max(16),
            })
            .nullable()
            .optional(),
    }),
    async handler({ products, shippingInfo }, context) {
        // The one action that reaches AusPost on every call. A customer quotes
        // once per completed address, so this only bites on scripted abuse.
        enforceRateLimit(context, { name: 'getShippingQuote', max: 40 })

        const totals = await calculateCheckoutTotals(products, shippingInfo)

        return {
            subtotal: totals.subtotalCents,
            shipping: totals.shippingCents,
            // Every service, so the address step can say what the cheapest is
            // and that faster ones exist, before asking for a card.
            options: totals.shippingOptions,
            total: totals.totalCents,
            currency: 'aud' as const,
        }
    },
})
