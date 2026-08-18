import { defineAction } from 'astro:actions'
import { z } from 'astro/zod'
import { stripeAPI } from '@/utils/server/stripe/index.server'
import { enforceRateLimit } from '@/utils/server/rateLimit.server'
import {
    assertCheckoutOwner,
    CHECKOUT_OWNER_KEY,
    readCheckoutOwner,
} from '@/utils/server/checkoutSession.server'
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
        voucher: z.string().trim().max(64).nullable().optional(),
    }),
    async handler(
        { paymentIntentId, products, shippingInfo, voucher },
        context,
    ) {
        enforceRateLimit(context, { name: 'updatePaymentIntent', max: 60 })

        // `paymentIntentId` arrives from the client and the id isn't secret —
        // Stripe puts it in the return URL — so establish that this caller is the
        // browser that created the intent before touching it, and do that before
        // the totals below spend anything upstream.
        const owner = readCheckoutOwner(context)

        // Fetch current payment intent to verify it exists and is in updatable state
        const currentIntent =
            await stripeAPI.paymentIntents.retrieve(paymentIntentId)

        assertCheckoutOwner(currentIntent, owner)

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

        // Recalculate totals with new shipping info
        const totals = await calculateCheckoutTotals(
            products,
            shippingInfo,
            voucher,
        )

        // Update metadata with new product/shipping info
        const normalizedProducts = await normalizeCartMetadata(products)

        // Update the payment intent with new amount and metadata
        const updatedIntent = await stripeAPI.paymentIntents.update(
            paymentIntentId,
            {
                amount: totals.totalCents,
                metadata: {
                    // A metadata update merges rather than replaces, but restate the
                    // owner so the binding is visible at the point it's relied on.
                    [CHECKOUT_OWNER_KEY]: owner,
                    products: normalizedProducts,
                    subtotalCents: totals.subtotalCents.toString(),
                    shippingCents: totals.shippingCents.toString(),
                    discountCents: totals.discountCents.toString(),
                },
            },
        )

        return {
            id: updatedIntent.id,
            subtotal: totals.subtotalCents,
            shipping: totals.shippingCents,
            discount: totals.discountCents,
            discountStatus: totals.discountStatus,
            total: updatedIntent.amount,
            currency: 'aud' as const,
            status: updatedIntent.status,
        }
    },
})
