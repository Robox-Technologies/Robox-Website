import { defineAction } from 'astro:actions'
import { z } from 'astro/zod'
import type { Stripe } from 'stripe'
import { stripeAPI } from '@/utils/server/stripe/index.server'
import { resolveShippingProductId } from '@/utils/server/stripe/shippingProduct.server'
import { enforceRateLimit } from '@/utils/server/rateLimit.server'
import {
    CHECKOUT_OWNER_KEY,
    resolveCheckoutOwner,
} from '@/utils/server/checkoutSession.server'
import {
    calculateCheckoutTotals,
    describeCartForHumans,
    normalizeCartMetadata,
    resolveCartEntries,
} from '../utils/checkoutPricing.server'
import { shipmentToMetadata } from '../utils/packaging.server'

const shippingDetailsSchema = z.object({
    name: z.string().trim().min(1).max(200),
    address: z.object({
        line1: z.string().trim().min(1).max(200),
        line2: z.string().trim().max(200).nullable().optional(),
        city: z.string().trim().max(100),
        state: z.string().trim().max(100).nullable().optional(),
        postal_code: z.string().trim().max(16),
        country: z.string().trim().length(2),
    }),
})

/**
 * Creates the Checkout Session the payment step runs on. No
 * `shipping_address_collection` or `shipping_options` — those make the wallets offer
 * an address of their own — so postage is a line item and the address rides in on
 * `payment_intent_data.shipping`. A changed cart gets a fresh session, not an edit.
 */
export const createCheckoutSession = defineAction({
    input: z.object({
        products: z.record(
            z.string(),
            z.object({
                quantity: z.number().int().nonnegative(),
            }),
        ),
        shippingDetails: shippingDetailsSchema,
        shippingServiceId: z.string().trim().max(32),
    }),
    async handler({ products, shippingDetails, shippingServiceId }, context) {
        // Ahead of the Stripe and AusPost reads below, so a flood costs us
        // nothing upstream.
        enforceRateLimit(context, { name: 'createCheckoutSession', max: 15 })

        // Records which browser this session belongs to; reading its status
        // later won't reveal the customer's email to anyone else.
        const owner = resolveCheckoutOwner(context)

        const address = shippingDetails.address
        const entries = await resolveCartEntries(products)

        // No voucher: discounts are Stripe's job now, applied against the
        // session from the client. Passing one here would price the order twice.
        const totals = await calculateCheckoutTotals(products, {
            country: address.country,
            postcode: address.postal_code,
        })

        const shipping: Stripe.Checkout.SessionCreateParams.PaymentIntentData.Shipping =
            {
                name: shippingDetails.name,
                address: {
                    line1: address.line1,
                    line2: address.line2 ?? undefined,
                    city: address.city,
                    state: address.state ?? undefined,
                    postal_code: address.postal_code,
                    country: address.country,
                },
            }

        // Resolved once and shared by both metadata blocks: two calls would be
        // two catalog reads for the same answer.
        const [productsMetadata, productSummary, shippingProductId] =
            await Promise.all([
                normalizeCartMetadata(products),
                describeCartForHumans(products),
                resolveShippingProductId(),
            ])

        // The client picks the service; the price comes from our quote, never the request.
        const chosen =
            totals.shippingOptions.find(
                (option) => option.id === shippingServiceId,
            ) ?? totals.shippingOptions[0]

        if (!chosen) {
            throw new Error('No shipping service available for this address')
        }

        const session = await stripeAPI.checkout.sessions.create({
            ui_mode: 'elements',
            mode: 'payment',
            // Reference the Price rather than restate an amount, so the charge
            // is whatever Stripe holds for the product.
            line_items: [
                ...entries.map((entry) => ({
                    price: entry.priceId,
                    quantity: entry.quantity,
                })),
                // A line item, not a `shipping_option`: shipping options make Apple Pay
                // and Link collect a delivery address of their own.
                {
                    price_data: {
                        currency: 'aud',
                        product: shippingProductId,
                        unit_amount: chosen.amountCents,
                    },
                    quantity: 1,
                },
            ],
            allow_promotion_codes: true,
            return_url: `${context.url.origin}/shop/checkout/status?session_id={CHECKOUT_SESSION_ID}`,
            metadata: {
                [CHECKOUT_OWNER_KEY]: owner,
                products: productsMetadata,
                // The same cart in words, because an id tells you nothing when
                // you are looking at a payment in the dashboard.
                productSummary,
            },
            payment_intent_data: {
                // The address from step one, so the receipt doesn't read the payment method's.
                shipping,
                // On the intent because the emails run off `payment_intent.succeeded`.
                metadata: {
                    [CHECKOUT_OWNER_KEY]: owner,
                    products: productsMetadata,
                    productSummary,
                    subtotalCents: totals.subtotalCents.toString(),
                    shippingCents: chosen.amountCents.toString(),
                    shippingService: chosen.label,
                    // What's physically being sent, so a consignment can be raised off the payment.
                    ...(totals.shipment
                        ? shipmentToMetadata(totals.shipment)
                        : {}),
                },
            },
        })

        if (!session.client_secret) {
            throw new Error('Unable to create checkout session secret')
        }

        return {
            id: session.id,
            clientSecret: session.client_secret,
        }
    },
})
