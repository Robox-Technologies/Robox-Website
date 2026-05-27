import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js'
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
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [addressLine1, setAddressLine1] = useState('')
    const [postcode, setPostcode] = useState('')

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault()

        if (!stripe || !elements) {
            return
        }

        setSubmitting(true)
        setMessage(null)

        // Attach billing details to the payment method
        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/shop/checkout`,
                payment_method_data: {
                    billing_details: {
                        name: name || undefined,
                        email: email || undefined,
                        address: {
                            line1: addressLine1 || undefined,
                            postal_code: postcode || undefined,
                        },
                    },
                },
            },
        })

        if (error) {
            setMessage(error.message ?? 'Unable to complete payment')
        }

        setSubmitting(false)
    }

    return (
        <form className="flex w-full flex-col gap-4" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 gap-3">
                <label className="flex flex-col">
                    <span className="text-sm font-medium">Name</span>
                    <input
                        className="mt-1 rounded-md border px-3 py-2"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </label>

                <label className="flex flex-col">
                    <span className="text-sm font-medium">Email</span>
                    <input
                        type="email"
                        className="mt-1 rounded-md border px-3 py-2"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                    />
                </label>

                <label className="flex flex-col">
                    <span className="text-sm font-medium">Address</span>
                    <input
                        className="mt-1 rounded-md border px-3 py-2"
                        value={addressLine1}
                        onChange={(e) => setAddressLine1(e.target.value)}
                    />
                </label>

                <label className="flex flex-col">
                    <span className="text-sm font-medium">Postcode</span>
                    <input
                        className="mt-1 rounded-md border px-3 py-2"
                        value={postcode}
                        onChange={(e) => setPostcode(e.target.value)}
                    />
                </label>
            </div>

            <PaymentElement />

            {message ? (
                <p className="mb-0 text-sm text-red-600">{message}</p>
            ) : null}

            <button
                type="submit"
                disabled={!stripe || !elements || submitting}
                className="inline-flex items-center justify-center rounded-lg bg-black px-4 py-3 font-semibold text-white transition-colors hover:bg-black/80 disabled:cursor-not-allowed disabled:bg-black/40"
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
            <section className="flex h-full min-h-128 flex-col gap-6">
                <p className="mb-0 text-gray-600">Preparing payment form...</p>

                <div className="flex flex-1 items-center justify-center rounded-xl border border-dashed border-black/20 bg-gray-50 p-6 text-center">
                    <div className="max-w-md">
                        <div className="mb-4 flex justify-center">
                            <FontAwesomeIcon icon={faSpinner} spin className="text-4xl text-black/70" />
                        </div>
                        <p className="mb-2 text-lg font-semibold text-black">
                            Payment form loading
                        </p>
                        <p className="mb-0 text-sm text-gray-600">
                            Stripe Elements will mount once the payment intent
                            is ready.
                        </p>
                    </div>
                </div>
            </section>
        )
    }

    const elementsOptions: StripeElementsOptions = {
        clientSecret,
        appearance: {
            theme: 'stripe' as const,
            variables: {
                colorPrimary: '#000000',
                colorBackground: 'transparent',
                borderRadius: '8px',
                spacingUnit: '4px',
            },
        },
    }

    return (
        <Elements stripe={stripePromise} options={elementsOptions}>
            <section className="flex h-full min-h-128 flex-col gap-6">
                <p className="mb-0 text-gray-600">
                    Complete payment using Stripe Elements.
                </p>

                <div className="flex flex-1 items-center justify-center px-0 py-2">
                    <div className="w-full max-w-xl">
                        <PaymentForm />
                    </div>
                </div>
            </section>
        </Elements>
    )
}