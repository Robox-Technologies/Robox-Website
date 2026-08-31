import { AddressElement, Elements } from '@stripe/react-stripe-js'
import type { StripeAddressElementChangeEvent } from '@stripe/stripe-js'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { GOOGLE_MAPS_API_KEY } from 'astro:env/client'
import type { Product } from '@/types/shop'
import { formatPrice } from '@/utils/formatPrice'
import { stripePromise } from '../../utils/stripe.client'
import { createCheckoutAppearance } from '../../utils/appearance'
import { checkoutStep, shippingDetails } from '../../state/checkoutStore'
import { useShipping } from '../../hooks/useShipping'

/**
 * Google powers the address suggestions, but only with a key.
 *
 * Stripe supplies its own Google Maps key for free when the Address Element
 * sits in the same Elements group as a Payment Element. This checkout collects
 * the address a step earlier than the card, so that no longer applies and the
 * key has to be ours. Without one, `automatic` leaves the fields working
 * exactly as they do now, just without suggestions - a missing key is a
 * degraded form, not a broken one.
 *
 * Autocomplete covers AU and 25 other countries; Stripe falls back to plain
 * fields elsewhere on its own.
 */
const ADDRESS_AUTOCOMPLETE = GOOGLE_MAPS_API_KEY
    ? ({ mode: 'google_maps_api', apiKey: GOOGLE_MAPS_API_KEY } as const)
    : ({ mode: 'automatic' } as const)

/**
 * Step one: the delivery address, and the postage it implies.
 *
 * The address is collected here rather than beside the payment fields because
 * the Checkout Session on the next step is created with the finished shipping
 * rate already baked in - see `checkoutStore.ts` for why that ordering is what
 * keeps the one-click wallets available.
 */
export default function CheckoutAddressSection({
    products,
}: {
    products: Product[]
}) {
    const { quote, shippingInfo, loading, error } = useShipping(products)

    const handleChange = (event: StripeAddressElementChangeEvent) => {
        // Stripe's own `complete` rather than a hand-rolled check: it knows
        // which fields each country actually requires, and Australia Post
        // rejects a half-typed postcode with a 404, so quoting eagerly would
        // mean a burst of errors on the way to a valid address.
        if (!event.complete) {
            shippingDetails.set(null)
            return
        }

        const { name, address } = event.value
        shippingDetails.set({
            name,
            address: {
                line1: address.line1,
                line2: address.line2 ?? null,
                city: address.city,
                state: address.state ?? null,
                postal_code: address.postal_code,
                country: address.country,
            },
        })
    }

    // Only advance once postage is known: the next step creates the session
    // with that figure already in it, so there is nothing to fall back on.
    const canContinue = Boolean(shippingInfo) && !loading && !error && !!quote

    return (
        <section className="relative flex min-h-72 w-full flex-1 flex-col">
            <h2 className="my-[20.75px] text-[25px] font-medium">Delivery</h2>

            <Elements
                stripe={stripePromise}
                options={{
                    appearance: createCheckoutAppearance(),
                    loader: 'always',
                }}
            >
                <AddressElement
                    options={{
                        mode: 'shipping',
                        // Stripe guesses the country from the browser, which
                        // offered "United Kingdom" to an Australian shop. Most
                        // orders are domestic, and the customer can still
                        // change it - Australia Post quotes internationally.
                        defaultValues: { address: { country: 'AU' } },
                        autocomplete: ADDRESS_AUTOCOMPLETE,
                    }}
                    onChange={handleChange}
                />
            </Elements>

            <div className="mt-6" aria-live="polite">
                {error ? (
                    <p
                        role="alert"
                        className="mb-0 rounded-lg border border-red bg-red/15 px-4 py-3 text-base"
                    >
                        {error}
                    </p>
                ) : loading ? (
                    <p className="mb-0 inline-flex items-center gap-2 text-base text-gray-700">
                        <FontAwesomeIcon
                            icon={faSpinner}
                            spin
                            className="text-sm"
                        />
                        Calculating postage...
                    </p>
                ) : quote && shippingInfo ? (
                    <p className="mb-0 text-base text-gray-700">
                        Standard shipping to this address:{' '}
                        <strong>{formatPrice(quote.shipping, true)}</strong>
                    </p>
                ) : (
                    <p className="mb-0 text-base text-gray-600">
                        Enter your delivery address to see postage.
                    </p>
                )}
            </div>

            {/* `.ctaButton.pill` again: same 50px pill the payment step ends on,
                so the two steps read as one flow. */}
            <button
                type="button"
                onClick={() => {
                    checkoutStep.set('payment')
                }}
                disabled={!canContinue}
                className="button-interactive mt-8 inline-flex h-[50px] w-full items-center justify-center gap-4 rounded-[25px] bg-red text-lg text-primary disabled:bg-tone3"
            >
                Continue to payment
            </button>
        </section>
    )
}
