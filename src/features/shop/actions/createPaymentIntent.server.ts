import { defineAction } from 'astro:actions'
import { z } from 'astro/zod'
import { stripeAPI } from '@utils/server/stripe.server'

export const createPaymentIntent = defineAction({
    input: z.object({
        products: z.record(z.string(), z.number().int().nonnegative()),
        cost: z.number().int().min(50),
    }),
    async handler({ products, cost }) {
        const entries = Object.entries(products).filter(
            ([, quantity]) => quantity > 0,
        )

        if (entries.length === 0) {
            throw new Error('At least one product is required')
        }

        const productIds = entries.map(([productId]) => productId)
        const quantitiesById = new Map(entries)

        const stripeProducts = await Promise.all(
            productIds.map(async (productId) => {
                const product = await stripeAPI.products.retrieve(productId, {
                    expand: ['default_price'],
                })

                const defaultPrice = product.default_price
                if (!defaultPrice || typeof defaultPrice === 'string') {
                    throw new Error(
                        `Product ${productId} has no default Stripe price`,
                    )
                }

                if (defaultPrice.currency !== 'aud') {
                    throw new Error(
                        `Product ${productId} has unsupported currency ${defaultPrice.currency}`,
                    )
                }

                if (defaultPrice.unit_amount === null) {
                    throw new Error(
                        `Product ${productId} has invalid Stripe unit amount`,
                    )
                }

                return {
                    productId,
                    unitAmount: defaultPrice.unit_amount,
                }
            }),
        )

        const validatedCost = stripeProducts.reduce((total, product) => {
            const quantity = quantitiesById.get(product.productId) ?? 0
            return total + product.unitAmount * quantity
        }, 0)

        if (validatedCost < 50) {
            throw new Error('Validated total is below minimum charge amount')
        }

        if (validatedCost !== cost) {
            throw new Error('Price validation failed: submitted cost mismatch')
        }

        const normalizedProducts = entries.map(
            ([productId, quantity]) => `${productId}:${quantity}`,
        )

        const intent = await stripeAPI.paymentIntents.create({
            amount: validatedCost,
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
        