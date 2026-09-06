import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

/**
 * Stands in for the payment column while Stripe loads. Must stay in flow — it doubles
 * as the `client:only` fallback, and an out-of-flow one collapses the row.
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
