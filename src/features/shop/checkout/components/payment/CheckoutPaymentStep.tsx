import { CheckoutElementsProvider } from '@stripe/react-stripe-js/checkout'
import { stripePromise } from '../../utils/stripe.client'
import { createCheckoutAppearance } from '../../utils/appearance'
import { useCheckoutSession } from '../../hooks/useCheckoutSession'
import CheckoutRow from '../CheckoutRow'
import CheckoutSessionSummary from '../summary/CheckoutSessionSummary'
import CheckoutSummaryLoadingState from '../summary/CheckoutSummaryLoadingState'
import CheckoutPaymentLoadingState from './CheckoutPaymentLoadingState'
import CheckoutStatePanel from './CheckoutStatePanel'
import { StripePaymentForm } from './StripePaymentForm'

/**
 * Step two: the Checkout Session, and everything that reads from it.
 *
 * Both columns sit inside one provider because the summary's figures come from
 * the session rather than from local arithmetic.
 */
export default function CheckoutPaymentStep() {
    const { clientSecret, error } = useCheckoutSession()

    if (error && !clientSecret) {
        return (
            <CheckoutRow>
                <section className="relative flex w-full flex-1 flex-col min-h-[675px]">
                    <CheckoutStatePanel heading="Checkout Error">
                        An error occurred while preparing your checkout.
                        <br />
                        Please review your cart items and try again.
                    </CheckoutStatePanel>
                </section>
                <CheckoutSummaryLoadingState />
            </CheckoutRow>
        )
    }

    if (!clientSecret) {
        return (
            <CheckoutRow>
                <CheckoutPaymentLoadingState />
                <CheckoutSummaryLoadingState />
            </CheckoutRow>
        )
    }

    return (
        // Keyed on the secret: a changed cart means a new session, and the
        // provider has to be rebuilt around it rather than updated.
        <CheckoutElementsProvider
            key={clientSecret}
            stripe={stripePromise}
            options={{
                clientSecret,
                // Declares that this page displays whatever currency the
                // session comes back in and renders the currency selector, which
                // is Stripe's condition for converting at all. Whether it
                // actually converts is the dashboard's call.
                adaptivePricing: { allowed: true },
                elementsOptions: {
                    appearance: createCheckoutAppearance(),
                    loader: 'always',
                },
            }}
        >
            <CheckoutRow>
                <StripePaymentForm error={error} />
                <CheckoutSessionSummary />
            </CheckoutRow>
        </CheckoutElementsProvider>
    )
}
