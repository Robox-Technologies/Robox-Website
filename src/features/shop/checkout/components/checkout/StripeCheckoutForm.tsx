import { Elements, PaymentElement, AddressElement, ContactDetailsElement, useElements, useStripe } from '@stripe/react-stripe-js'
import type { StripeElementsOptions } from '@stripe/stripe-js'
import { faSpinner } from '@fortawesome/free-solid-svg-icons/faSpinner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState } from 'react'
import { stripePromise } from '../../utils/stripe.client'

function PaymentForm() {
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
            <PaymentElement />

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
    if (!clientSecret) {
        return (
            <section className="flex flex-col gap-6">
                <p className="mb-0 text-gray-600">Preparing payment form...</p>

                <div className="flex items-center justify-center rounded-xl border border-dashed border-black/20 bg-gray-50 p-6 text-center">
                    <div className="mx-auto max-w-md">
                        <div className="mb-4 flex justify-center">
                            <FontAwesomeIcon icon={faSpinner} spin className="text-4xl text-black/70" />
                        </div>
                        <p className="mb-2 text-lg font-semibold text-black">Payment form loading</p>
                        <p className="mb-0 text-sm text-gray-600">
                            Stripe Elements will mount once the payment intent is ready.
                        </p>
                    </div>
                </div>
            </section>
        )
    }

    const elementsOptions: StripeElementsOptions = {
        clientSecret,
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
        <Elements stripe={stripePromise} options={elementsOptions}>
            <section className="flex flex-col gap-6">
                <PaymentForm />
            </section>
        </Elements>
    )
}