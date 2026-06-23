import { defineAction } from 'astro:actions'
import { z } from 'astro/zod'
import { stripeAPI } from '@/utils/server/stripe.server'
import {
    calculateCheckoutTotals,
    normalizeCartMetadata,
} from '../utils/checkoutPricing.server'

export const createPaymentIntent = defineAction({
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
        cost: z.number().int().min(50),
    }),
    async handler({ products, shippingInfo, cost }) {
        const totals = await calculateCheckoutTotals(products, shippingInfo)

        if (totals.totalCents !== cost) {
            throw new Error('Price validation failed: submitted cost mismatch')
        }

        const normalizedProducts = await normalizeCartMetadata(products)

        const intent = await stripeAPI.paymentIntents.create({
            amount: totals.totalCents,
            currency: 'aud',
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                products: normalizedProducts,
                subtotalCents: totals.subtotalCents.toString(),
                shippingCents: totals.shippingCents.toString(),
            },
        })

        if (!intent.client_secret) {
            throw new Error('Unable to create payment intent secret')
        }

        return {
            id: intent.id,
            clientSecret: intent.client_secret,
        }
    },
})
        