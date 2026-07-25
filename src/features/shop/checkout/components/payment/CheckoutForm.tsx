import { Elements } from '@stripe/react-stripe-js'
import type { StripeElementsOptions } from '@stripe/stripe-js'
import { stripePromise } from '../../utils/stripe.client'
import CheckoutPaymentLoadingState from './CheckoutPaymentLoadingState'
import { StripePaymentForm } from './StripePaymentForm'
import { useState } from 'react'

export default function CheckoutForm({
    clientSecret,
    error,
}: {
    clientSecret: string | null
    error?: string | null
}) {
    const [isReady, setReady] = useState(false)
    const isLoading = !isReady || !clientSecret

    const elementsOptions: StripeElementsOptions = {
        loader: 'always',
        clientSecret: clientSecret ?? undefined,
        appearance: {
            theme: 'stripe',
            variables: {
                colorPrimaryText: '#262626',
                colorText: '#0f172a',
                colorPrimary: '#2563eb',
                fontFamily:
                    'Nunito, ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
                fontSizeBase: '16px',
            },
            rules: {
                '.AccordionItem': {
                    border: 'none',
                    paddingTop: '0',
                    paddingLeft: '0',
                },
                '.Input': {
                    backgroundColor: '#fff',
                },
            },
        },
    }

    return (
        <>
            {isLoading && (
                <div className="absolute inset-0 flex items-center justify-center">
                    <CheckoutPaymentLoadingState />
                </div>
            )}
            <section className="relative flex min-h-72 flex-col gap-6">
                {error && !isLoading && (
                    <p
                        role="alert"
                        className="mb-0 rounded-lg border border-red bg-red/15 px-4 py-3 text-base"
                    >
                        {error}
                    </p>
                )}

                {clientSecret && (
                    <div className={isLoading ? 'invisible' : undefined}>
                        <Elements stripe={stripePromise} options={elementsOptions}>
                            <StripePaymentForm setReady={setReady} />
                        </Elements>
                    </div>
                )}
            </section>
        </>
    )
}