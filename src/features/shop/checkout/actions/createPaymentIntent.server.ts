import { defineAction } from 'astro:actions'
import { z } from 'astro/zod'
import { stripeAPI } from '@/utils/server/stripe/index.server'
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

        // Compare against the subtotal, not the total: the client sends the cart
        // value it computed, and it can't know the shipping we're about to quote.
        // Comparing totals meant that creating an intent with an address already
        // filled in failed outright. The charged amount is `totals.totalCents`
        // below either way, so this stays an integrity check on the cart.
        if (totals.subtotalCents !== cost) {
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
        