import CheckoutRow from './CheckoutRow'
import CheckoutPaymentLoadingState from './payment/CheckoutPaymentLoadingState'
import CheckoutSummaryLoadingState from './summary/CheckoutSummaryLoadingState'

/**
 * The `client:only` fallback for the whole checkout. It has to hold the row
 * open at the same shape the hydrated view uses, or the page reflows as the
 * island arrives.
 */
export default function CheckoutViewLoadingState() {
    return (
        <CheckoutRow>
            <CheckoutPaymentLoadingState />
            <CheckoutSummaryLoadingState />
        </CheckoutRow>
    )
}
