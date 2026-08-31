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
 * Creates the Checkout Session the payment step runs on.
 *
 * The delivery address and the postage are both settled before this runs, and
 * neither is anything the session collects: there is no
 * `shipping_address_collection` and no `shipping_options`. Postage is an
 * ordinary line item instead.
 *
 * That shape is deliberate. A session carrying shipping options is a shipping
 * order as far as the wallets are concerned, and both Apple Pay and Link
 * respond by offering a delivery address of their own - Link defaults to the
 * customer's saved address, which is generally not the one they just typed. An
 * order could then ship somewhere the postage was never quoted for. With a
 * fixed total and no shipping fields, the wallets have nothing to ask about.
 *
 * The address still reaches the order through `payment_intent_data.shipping`,
 * which the server sets and the customer cannot touch.
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

        // The client chooses *which* service; the price comes from our own
        // quote, never from the request. An unrecognised id falls back to the
        // cheapest rather than failing the checkout.
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
                // Postage as a line item, not a `shipping_option`. Any session
                // carrying shipping options makes the wallets collect a
                // delivery address of their own - Apple Pay and Link both do -
                // which would let an order ship somewhere the postage was never
                // quoted for. As a line item the session is an ordinary
                // fixed-total order and the wallets have nothing to ask about.
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
                    shippingCents: chosen.amountCents.toString(),
                    shippingService: chosen.label,
                    // What is physically being sent, so an Australia Post
                    // consignment can be raised straight off the payment
                    // rather than re-deriving the parcel from the cart.
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
