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
        shippingInfo: z
            .object({
                country: z.string().trim().min(2).max(2),
                postcode: z.string().trim().max(16),
            })
            .nullable()
            .optional(),
        voucher: z.string().trim().max(64).nullable().optional(),
    }),
    async handler({ products, shippingInfo, voucher }) {
        const totals = await calculateCheckoutTotals(
            products,
            shippingInfo,
            voucher,
        )

        return {
            subtotal: totals.subtotalCents,
            shipping: totals.shippingCents,
            discount: totals.discountCents,
            discountStatus: totals.discountStatus,
            total: totals.totalCents,
            currency: 'aud' as const,
        }
    },
})
