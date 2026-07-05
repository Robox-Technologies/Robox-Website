import {
    PaymentElement,
    AddressElement,
    ContactDetailsElement,
    useElements,
    useStripe,
} from '@stripe/react-stripe-js'
import type {
    StripeAddressElementChangeEvent,
    StripeContactDetailsElementChangeEvent,
} from '@stripe/stripe-js'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useState, type SetStateAction } from 'react'
import type { Dispatch } from 'react'
import { useShipping } from '../../hooks/useShipping'

export function StripePaymentForm({
    setReady,
}: {
    setReady: Dispatch<SetStateAction<boolean>>
}) {
    const stripe = useStripe()
    const elements = useElements()
    const { setShippingInfo } = useShipping()
    const [submitting, setSubmitting] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const [email, setEmail] = useState<string | null>(null)

    const handleAddressChange = (
        event: StripeAddressElementChangeEvent,
    ) => {
        const country = event.value.address.country.trim()
        const postcode = event.value.address.postal_code.trim()
        if (!country || !postcode) {
            setShippingInfo(null)
            return
        }
        setShippingInfo({
            country,
            postcode,
        })
    }

    const handleContactChange = (
        event: StripeContactDetailsElementChangeEvent,
    ) => {
        setEmail(event.value.email || null)
    }

    const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!stripe || !elements) {
            return
        }
        setSubmitting(true)
        setMessage(null)
        const { error } = await stripe.confirmPayment({
            elements,
            confirmParams: {
                return_url: `${window.location.origin}/shop/checkout/status`,
                receipt_email: email ?? undefined,
            },
        })
        if (error) {
            setMessage(error.message ?? 'Unable to complete payment')
        }
        setSubmitting(false)
    }

    return (
        <form
            className="flex w-full flex-col gap-4 rounded-xl border border-black/10 bg-white p-6 shadow-sm"
            onSubmit={handleSubmit}
        >
            <ContactDetailsElement onChange={handleContactChange} />
            <AddressElement options={{ mode: 'billing' }} onChange={handleAddressChange} />
            <PaymentElement onReady={() => { setReady(true) }} />
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
                        <FontAwesomeIcon
                            icon={faSpinner}
                            spin
                            className="text-sm"
                        />
                        Processing...
                    </span>
                ) : (
                    'Pay now'
                )}
            </button>
        </form>
    )
}