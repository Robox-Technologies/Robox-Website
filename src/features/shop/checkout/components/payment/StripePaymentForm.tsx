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
    const [termsAccepted, setTermsAccepted] = useState(false)

    const handleAddressChange = (
        event: StripeAddressElementChangeEvent,
    ) => {
        // Wait for Stripe's own `complete` before quoting. This fires on every
        // keystroke, and AusPost rejects half-typed postcodes with a 404 — so
        // quoting eagerly meant a burst of errors on the way to a valid
        // address. `complete` is country-aware, unlike a hand-rolled check.
        if (!event.complete) {
            setShippingInfo(null)
            return
        }
        const country = event.value.address.country.trim()
        const postcode = event.value.address.postal_code.trim()
        if (!country) {
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
        if (!stripe || !elements || !termsAccepted) {
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
        // The original's `#payment-form` carries no card chrome — the Stripe
        // elements supply their own field styling against the page background.
        <form
            className="flex w-full flex-1 flex-col gap-4"
            onSubmit={handleSubmit}
        >
            <ContactDetailsElement onChange={handleContactChange} />
            <AddressElement options={{ mode: 'billing' }} onChange={handleAddressChange} />
            <PaymentElement onReady={() => { setReady(true) }} />
            {message ? (
                <p className="mb-0 text-sm text-red-600">{message}</p>
            ) : null}
            <div className="flex items-start gap-2">
                <input
                    type="checkbox"
                    id="termsConsent"
                    required
                    checked={termsAccepted}
                    onChange={(event) =>
                        setTermsAccepted(event.currentTarget.checked)
                    }
                    className="mt-1.5 h-4 w-4 shrink-0"
                />
                <label htmlFor="termsConsent" className="text-base">
                    I agree to the{' '}
                    <a
                        href="/tos"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                    >
                        Consumer Terms of Sale
                    </a>{' '}
                    for this purchase.
                </label>
            </div>
            {/* `.ctaButton.pill` + `#submit`: full-width 50px pill, pushed to
                the bottom of the form and greyed out until it's usable. */}
            <button
                type="submit"
                disabled={!stripe || !elements || submitting || !termsAccepted}
                className="button-interactive mt-8 inline-flex h-[50px] w-full items-center justify-center gap-4 rounded-[25px] bg-red text-lg text-primary disabled:bg-tone3"
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