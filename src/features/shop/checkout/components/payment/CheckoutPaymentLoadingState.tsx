import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

/**
 * Stands in for the payment column while Stripe loads. It has to stay *in
 * flow*: this doubles as the `client:only` fallback for the whole payment
 * section, and while it was `absolute inset-0` it took up no space at all, so
 * the flex row collapsed and the order summary rendered on the left until
 * hydration finished. `CheckoutForm` supplies the positioned wrapper when it
 * needs this as an overlay.
 */
export default function CheckoutPaymentLoadingState() {
    return (
        <div className="flex min-h-[675px] w-full flex-1 items-center justify-center">
            <FontAwesomeIcon
                icon={faSpinner}
                spin
                size="4x"
                className="text-black/80"
            />
        </div>
    )
}
