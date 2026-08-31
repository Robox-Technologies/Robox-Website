import {
    ContactDetailsElement,
    CurrencySelectorElement,
    ExpressCheckoutElement,
    PaymentElement,
    useCheckoutElements,
} from '@stripe/react-stripe-js/checkout'
import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useStore } from '@nanostores/react'
import type {
    StripeCheckoutExpressCheckoutElementOptions,
    StripeExpressCheckoutElementConfirmEvent,
} from '@stripe/stripe-js'
import { useState } from 'react'
import { checkoutStep, shippingDetails } from '../../state/checkoutStore'
import CheckoutPaymentLoadingState from './CheckoutPaymentLoadingState'

/**
 * Every key is spelled out because Stripe's type requires all of them present,
 * even though each value is itself optional - so this can't be narrowed to just
 * the one setting we care about.
 */
const EXPRESS_CHECKOUT_OPTIONS: StripeCheckoutExpressCheckoutElementOptions = {
    // Matches the 50px pill the card path submits with.
    buttonHeight: 50,
    buttonTheme: undefined,
    buttonType: undefined,
    layout: undefined,
    paymentMethodOrder: undefined,
    paymentMethods: undefined,
}

export function StripePaymentForm({ error }: { error?: string | null }) {
    const checkoutState = useCheckoutElements()
    const shipping = useStore(shippingDetails)
    const [submitting, setSubmitting] = useState(false)
    const [message, setMessage] = useState<string | null>(null)
    const [termsAccepted, setTermsAccepted] = useState(false)
    // Undefined until Stripe reports; null once it reports none. Wallet
    // availability depends on the device, so the block is only given space
    // once we know something will fill it.
    const [walletsAvailable, setWalletsAvailable] = useState(false)

    if (checkoutState.type === 'loading') {
        return <CheckoutPaymentLoadingState />
    }

    if (checkoutState.type === 'error') {
        return (
            <section className="relative flex min-h-72 w-full flex-1 flex-col">
                <h2 className="my-[20.75px] text-[25px] font-medium">
                    Payment
                </h2>
                <p
                    role="alert"
                    className="mb-4 rounded-lg border border-red bg-red/15 px-4 py-3 text-base"
                >
                    {checkoutState.error.message}
                </p>
            </section>
        )
    }

    const { checkout } = checkoutState

    const handleWalletConfirm = async (
        event: StripeExpressCheckoutElementConfirmEvent,
    ) => {
        setSubmitting(true)
        const result = await checkout.confirm({
            expressCheckoutConfirmEvent: event,
        })
        if (result.type === 'error') {
            setMessage(result.error.message)
        }
        setSubmitting(false)
    }

    const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!termsAccepted || submitting) return

        setSubmitting(true)
        setMessage(null)

        // One confirm for every payment method, and the return URL is already
        // on the session - so unlike `confirmPayment` there is nothing to pass
        // here. Stripe redirects to it, or resolves in place for methods that
        // need no redirect.
        const result = await checkout.confirm()

        if (result.type === 'error') {
            setMessage(result.error.message)
        }

        setSubmitting(false)
    }

    // Stripe's own readiness check, rather than tracking whether each element
    // has rendered: it knows what this session still needs collected.
    const canPay = checkout.canConfirm && termsAccepted && !submitting

    return (
        <section className="relative flex min-h-72 w-full flex-1 flex-col">
            <h2 className="my-[20.75px] text-[25px] font-medium">Payment</h2>

            {error && (
                <p
                    role="alert"
                    className="mb-4 rounded-lg border border-red bg-red/15 px-4 py-3 text-base"
                >
                    {error}
                </p>
            )}

            <form
                className="flex w-full flex-1 flex-col gap-4"
                onSubmit={(event) => void handleSubmit(event)}
            >
                {shipping && (
                    <p className="mb-0 text-base text-gray-700">
                        Delivering to {shipping.name}, {shipping.address.line1},{' '}
                        {shipping.address.city} {shipping.address.postal_code}
                        {' — '}
                        <button
                            type="button"
                            onClick={() => {
                                checkoutStep.set('address')
                            }}
                            className="underline"
                        >
                            change
                        </button>
                    </p>
                )}
                {/* Above the wallets, per Stripe's guidance: the selected
                    currency changes which wallets can be offered, so the
                    customer should see it first. Renders nothing when the
                    session has no alternative currencies. */}
                <CurrencySelectorElement />

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

                {/* The wallets are mounted only once the terms are accepted.
                    The Checkout-Sessions Express Checkout Element has no
                    pre-sheet `onClick` hook, so the alternative was letting a
                    customer authorise with Face ID and only then telling them
                    we couldn't accept it. Mounting late rather than hiding a
                    mounted element on purpose: Stripe's elements do not
                    initialise reliably inside a hidden container. */}
                {termsAccepted ? (
                    <>
                        <ExpressCheckoutElement
                            options={EXPRESS_CHECKOUT_OPTIONS}
                            onAvailablePaymentMethodsChange={({
                                paymentMethods,
                            }) => {
                                setWalletsAvailable(Boolean(paymentMethods))
                            }}
                            onConfirm={(event) =>
                                void handleWalletConfirm(event)
                            }
                        />
                        {walletsAvailable && (
                            <div className="flex items-center gap-4 text-sm text-gray-600">
                                <hr className="flex-1 border-t border-black/10" />
                                or pay with card
                                <hr className="flex-1 border-t border-black/10" />
                            </div>
                        )}
                    </>
                ) : (
                    <p className="mb-0 text-sm text-gray-600">
                        Agree to the terms above to pay with Apple Pay, Google
                        Pay or Link.
                    </p>
                )}

                <ContactDetailsElement />
                <PaymentElement />
                {message ? (
                    <p className="mb-0 text-sm text-red-600" role="alert">
                        {message}
                    </p>
                ) : null}
                {/* `.ctaButton.pill` + `#submit`: full-width 50px pill, pushed to
                    the bottom of the form and greyed out until it's usable. */}
                <button
                    type="submit"
                    disabled={!canPay}
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
        </section>
    )
}
