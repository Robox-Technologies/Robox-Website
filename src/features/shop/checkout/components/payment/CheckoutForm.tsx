import { Elements } from '@stripe/react-stripe-js'
import type { StripeElementsOptions } from '@stripe/stripe-js'
import { stripePromise } from '../../utils/stripe.client'
import { createCheckoutAppearance } from '../../utils/appearance'
import CheckoutPaymentLoadingState from './CheckoutPaymentLoadingState'
import { StripePaymentForm } from './StripePaymentForm'
import { useMemo, useState } from 'react'

export default function CheckoutForm({
    clientSecret,
    error,
}: {
    clientSecret: string | null
    error?: string | null
}) {
    const [isReady, setReady] = useState(false)
    const isLoading = !isReady || !clientSecret

    // Memoised on the client secret, not rebuilt per render. `<Elements>`
    // reacts to a new `options` identity by calling `elements.update()`, and
    // this component re-renders on every cart and payment-intent change - so a
    // fresh object each time meant a stream of updates that the elements never
    // finished initialising through. They stayed 0px high and `onReady` never
    // fired, leaving the form hidden behind its own spinner.
    const elementsOptions: StripeElementsOptions = useMemo(
        () => ({
            loader: 'always',
            clientSecret: clientSecret ?? undefined,
            appearance: createCheckoutAppearance(),
        }),
        [clientSecret],
    )

    return (
        <>
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <CheckoutPaymentLoadingState />
                </div>
            )}
            <section className="relative flex min-h-72 flex-1 flex-col">
                <h2 className="my-[20.75px] text-[25px] font-medium">
                    Payment
                </h2>

                {error && !isLoading && (
                    <p
                        role="alert"
                        className="mb-4 rounded-lg border border-red bg-red/15 px-4 py-3 text-base"
                    >
                        {error}
                    </p>
                )}

                {clientSecret && (
                    <div
                        className={`flex flex-1 flex-col${isLoading ? ' invisible' : ''}`}
                    >
                        <Elements
                            stripe={stripePromise}
                            options={elementsOptions}
                        >
                            <StripePaymentForm setReady={setReady} />
                        </Elements>
                    </div>
                )}
            </section>
        </>
    )
}
