import CheckoutRow from './CheckoutRow'
import CheckoutPaymentLoadingState from './payment/CheckoutPaymentLoadingState'
import CheckoutSummaryLoadingState from './summary/CheckoutSummaryLoadingState'

/** The `client:only` fallback. Holds the row at the hydrated shape so the page doesn't reflow. */
export default function CheckoutViewLoadingState() {
    return (
        <CheckoutRow>
            <CheckoutPaymentLoadingState />
            <CheckoutSummaryLoadingState />
        </CheckoutRow>
    )
}
