import { defineAction } from 'astro:actions'
import { z } from 'astro/zod'
import { stripeAPI } from '@utils/server/stripe.server'
import {
    calculateCheckoutTotals,
    normalizeCartMetadata,
} from '../utils/checkoutPricing.server'

export const updatePaymentIntent = defineAction({
    input: z.object({
        paymentIntentId: z.string().min(1),
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
    async handler({ paymentIntentId, products, shippingInfo }) {
        // Recalculate totals with new shipping info
        const totals = await calculateCheckoutTotals(products, shippingInfo)

        // Fetch current payment intent to verify it exists and is in updatable state
        const currentIntent = await stripeAPI.paymentIntents.retrieve(paymentIntentId)

        // Only allow updates if the payment intent hasn't been processed
        if (
            currentIntent.status !== 'requires_payment_method' &&
            currentIntent.status !== 'requires_confirmation' &&
            currentIntent.status !== 'requires_action'
        ) {
            throw new Error(
                `Cannot update payment intent with status: ${currentIntent.status}`,
            )
        }

        // Update metadata with new product/shipping info
        const normalizedProducts = await normalizeCartMetadata(products)

        // Update the payment intent with new amount and metadata
        const updatedIntent = await stripeAPI.paymentIntents.update(paymentIntentId, {
            amount: totals.totalCents,
            metadata: {
                products: normalizedProducts,
                subtotalCents: totals.subtotalCents.toString(),
                shippingCents: totals.shippingCents.toString(),
            },
        })

        return {
            id: updatedIntent.id,
            subtotal: totals.subtotalCents,
            shipping: totals.shippingCents,
            total: updatedIntent.amount,
            currency: 'aud' as const,
            status: updatedIntent.status,
        }
    },
})
