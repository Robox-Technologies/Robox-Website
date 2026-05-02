import { defineAction } from 'astro:actions'
import { z } from 'astro/zod'
import { stripeAPI } from '@utils/server/stripe.server'

export const createPaymentIntent = defineAction({
    input: z.object({
        products: z.record(z.string(), z.number().int().nonnegative()),
        cost: z.number().int().min(50),
    }),
    async handler({ products, cost }) {
        const normalizedProducts = Object.entries(products)
            .filter(([, quantity]) => quantity > 0)
            .map(([productId, quantity]) => `${productId}:${quantity}`)

        const intent = await stripeAPI.paymentIntents.create({
            amount: cost,
            currency: 'aud',
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                products: normalizedProducts.join(','),
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
        