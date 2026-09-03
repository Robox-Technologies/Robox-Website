import { AddressElement, Elements } from '@stripe/react-stripe-js'
import type { StripeAddressElementChangeEvent } from '@stripe/stripe-js'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { GOOGLE_MAPS_API_KEY } from 'astro:env/client'
import { useStore } from '@nanostores/react'
import type { Product } from '@/types/shop'
import { formatPrice } from '@/utils/formatPrice'
import { stripePromise } from '../../utils/stripe.client'
import { createCheckoutAppearance } from '../../utils/appearance'
import {
    checkoutStep,
    shippingDetails,
    shippingServiceId,
} from '../../state/checkoutStore'
import { useShipping } from '../../hooks/useShipping'

/**
 * Address suggestions need our own Google Maps key, since Stripe only supplies one when
 * the Address Element shares an Elements group with a Payment Element. Missing key just
 * means no suggestions.
 */
const ADDRESS_AUTOCOMPLETE = GOOGLE_MAPS_API_KEY
    ? ({ mode: 'google_maps_api', apiKey: GOOGLE_MAPS_API_KEY } as const)
    : ({ mode: 'automatic' } as const)

/** Step one: the delivery address and the postage it implies. See `checkoutStore.ts` for the ordering. */
export default function CheckoutAddressSection({
    products,
}: {
    products: Product[]
}) {
    const { quote, shippingInfo, loading, error } = useShipping(products)
    const selectedService = useStore(shippingServiceId)
    const selectedShippingCents =
        quote?.options.find((option) => option.id === selectedService)
            ?.amountCents ??
        quote?.shipping ??
        0

    const handleChange = (event: StripeAddressElementChangeEvent) => {
        // Stripe's `complete` knows each country's required fields; quoting eagerly
        // would 404 against Australia Post on every half-typed postcode.
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
                        // Stripe otherwise guesses the country from the browser.
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
                    <div className="text-base text-gray-700">
                        <p className="mb-0">
                            Shipping to this address:{' '}
                            <strong>
                                {formatPrice(selectedShippingCents, true)}
                            </strong>
                        </p>
                        {quote.options.length > 1 && (
                            <fieldset className="mt-3 flex flex-col gap-2">
                                <legend className="text-md mb-1 font-medium text-black">
                                    Delivery speed
                                </legend>
                                {quote.options.map((option) => (
                                    <label
                                        key={option.id}
                                        className="flex cursor-pointer items-start gap-2 text-base"
                                    >
                                        <input
                                            type="radio"
                                            name="shippingService"
                                            value={option.id}
                                            checked={
                                                option.id === selectedService
                                            }
                                            onChange={() => {
                                                shippingServiceId.set(option.id)
                                            }}
                                            className="mt-1.5 h-4 w-4 shrink-0"
                                        />
                                        <span className="flex min-w-0 flex-1 justify-between gap-3">
                                            <span className="min-w-0">
                                                {option.label}
                                                <span className="block text-sm text-gray-600">
                                                    {
                                                        option.estimateDays
                                                            .minimum
                                                    }
                                                    –
                                                    {
                                                        option.estimateDays
                                                            .maximum
                                                    }{' '}
                                                    business days
                                                </span>
                                            </span>
                                            <span className="shrink-0">
                                                {formatPrice(
                                                    option.amountCents,
                                                    true,
                                                )}
                                            </span>
                                        </span>
                                    </label>
                                ))}
                            </fieldset>
                        )}
                    </div>
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
