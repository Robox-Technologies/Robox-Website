import { defineAction } from 'astro:actions'
import { z } from 'astro/zod'
import type { Stripe } from 'stripe'
import { stripeAPI } from '@/utils/server/stripe/index.server'
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

/**
 * How long Australia Post says a domestic parcel takes. Shown against the
 * shipping rate in Stripe's own UI, so it is worth stating rather than leaving
 * the customer to guess.
 */
const DELIVERY_ESTIMATE = {
    minimum: { unit: 'business_day' as const, value: 2 },
    maximum: { unit: 'business_day' as const, value: 8 },
}

/**
 * The shipment written onto the PaymentIntent, flattened into metadata's
 * string-only values. Absent rather than empty when there is nothing to ship,
 * so a missing key means "no shipment was priced" instead of "zero grams".
 */
function shipmentMetadata(
    shipment: Awaited<ReturnType<typeof calculateCheckoutTotals>>['shipment'],
): Record<string, string> {
    if (!shipment) return {}

    const { parcel } = shipment
    return {
        weightGrams: shipment.weightGrams.toString(),
        parcelDimensionsCm: `${parcel.length}x${parcel.width}x${parcel.height}`,
        packagingCents: shipment.packagingCents.toString(),
        packaging: shipment.packagingDescription,
    }
}

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
 * Creates the Checkout Session the payment step runs on.
 *
 * The delivery address is already known, so the exact Australia Post rate goes
 * in as the session's one `shipping_option` and the session deliberately sets
 * no `shipping_address_collection`. That combination is what keeps Apple Pay
 * and Google Pay usable: Stripe turns those wallets off when the server owns
 * the shipping details, and a wallet that collects its own address would
 * bypass the quote entirely.
 *
 * There is no update counterpart. `payment_intent_data` cannot be changed after
 * creation, and it carries the figures the receipt email reads - so a cart that
 * changes underneath gets a fresh session rather than an edited one whose
 * PaymentIntent metadata no longer matches what is charged.
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
    }),
    async handler({ products, shippingDetails }, context) {
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
        const [productsMetadata, productSummary] = await Promise.all([
            normalizeCartMetadata(products),
            describeCartForHumans(products),
        ])

        const session = await stripeAPI.checkout.sessions.create({
            ui_mode: 'elements',
            mode: 'payment',
            // Reference the Price rather than restate an amount, so the charge
            // is whatever Stripe holds for the product.
            line_items: entries.map((entry) => ({
                price: entry.priceId,
                quantity: entry.quantity,
            })),
            shipping_options: [
                {
                    shipping_rate_data: {
                        display_name: 'Standard shipping',
                        type: 'fixed_amount',
                        fixed_amount: {
                            amount: totals.shippingCents,
                            currency: 'aud',
                        },
                        delivery_estimate: DELIVERY_ESTIMATE,
                    },
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
                // The address the customer gave on the first step, so the
                // receipt reads it off the intent rather than off whatever the
                // payment method happened to carry.
                shipping,
                // Mirrored onto the intent because the order emails are driven
                // from `payment_intent.succeeded`. Not updatable afterwards,
                // which is why a changed cart means a new session.
                metadata: {
                    [CHECKOUT_OWNER_KEY]: owner,
                    products: productsMetadata,
                    productSummary,
                    subtotalCents: totals.subtotalCents.toString(),
                    shippingCents: totals.shippingCents.toString(),
                    // What is physically being sent, so an Australia Post
                    // consignment can be raised straight off the payment
                    // rather than re-deriving the parcel from the cart.
                    ...shipmentMetadata(totals.shipment),
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
