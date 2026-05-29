import { Elements, PaymentElement, AddressElement, ContactDetailsElement, useElements, useStripe } from '@stripe/react-stripe-js'
import type { StripeElementsOptions } from '@stripe/stripe-js'
import { faSpinner } from '@fortawesome/free-solid-svg-icons/faSpinner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useEffect, useState } from 'react'
import { stripePromise } from '../../utils/stripe.client'
import CheckoutLoadingState from './CheckoutLoadingState'

function PaymentForm({ onReady }: { onReady: () => void }) {
    const stripe = useStripe()
    const elements = useElements()
    const [submitting, setSubmitting] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        if (!stripe || !elements) {
            return
        }

        setSubmitting(true)
        setMessage(null)

        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/shop/checkout`,
            },
        })

        if (error) {
            setMessage(error.message ?? 'Unable to complete payment')
        }

        setSubmitting(false)
    }

    return (
        <form className="flex w-full flex-col gap-4" onSubmit={handleSubmit}>
            <ContactDetailsElement />
            <AddressElement options={{ mode: 'billing' }} />
            <PaymentElement onReady={onReady} />

            {message ? (
                <p className="mb-0 text-sm text-red-600">{message}</p>
            ) : null}

            <button
                type="submit"
                disabled={!stripe || !elements || submitting}
                className="inline-flex items-center justify-center rounded-lg bg-blue px-4 py-3 font-semibold text-white transition-colors hover:bg-blue-dark disabled:cursor-not-allowed disabled:opacity-60"
            >
                {submitting ? (
                    <span className="inline-flex items-center gap-2">
                        <FontAwesomeIcon icon={faSpinner} spin className="text-sm" />
                        Processing...
                    </span>
                ) : (
                    'Pay now'
                )}
            </button>
        </form>
    )
}

export default function StripeCheckoutForm({
    clientSecret,
}: {
    clientSecret: string | null
}) {
    const [ready, setReady] = useState(false)

    useEffect(() => {
        setReady(false)
    }, [clientSecret])

    if (!clientSecret) {
        return (
            <section className="flex min-h-72 items-center justify-center">
                <CheckoutLoadingState />
            </section>
        )
    }

    const elementsOptions: StripeElementsOptions = {
        clientSecret,
        loader: 'always',
        appearance: {
            theme: 'stripe',
            variables: {
                colorBackground: '#f8f8f8',
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
                    padding: '0',
                },
                '.Input': {
                    backgroundColor: '#fff',
                }
            }
        },
    }

    return (
        <Elements key={clientSecret} stripe={stripePromise} options={elementsOptions}>
            <section className="relative flex min-h-72 flex-col gap-6">
                {!ready ? (
                    <div className="absolute inset-0 z-10 flex items-center justify-center">
                        <CheckoutLoadingState />
                    </div>
                ) : null}

                <div className={ready ? 'opacity-100' : 'opacity-0 pointer-events-none'}>
                    <PaymentForm onReady={() => setReady(true)} />
                </div>
            </section>
        </Elements>
    )
}