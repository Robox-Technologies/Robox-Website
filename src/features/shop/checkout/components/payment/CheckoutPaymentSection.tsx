import { usePaymentID } from '@/features/shop/checkout/hooks/usePaymentID'
import { useCartTotals } from '@/features/shop/hooks/useCartTotals'
import type { Product } from '@/types/shop'
import StripeCheckoutForm from './CheckoutForm'
import CheckoutStatePanel from './CheckoutStatePanel'

/** Stripe's floor for a charge; below it no payment intent is created. */
const MINIMUM_CHARGE_CENTS = 50

export default function CheckoutPaymentSection({
    products,
}: {
    products: Product[]
}) {
    const { clientSecret, error } = usePaymentID(products)
    const subtotalCents = useCartTotals(products)

    return (
        <section className="flex w-full min-h-0 flex-1 relative flex-col gap-6 overflow-hidden lg:h-full lg:min-h-168 lg:overflow-visible">
            {subtotalCents < MINIMUM_CHARGE_CENTS ? (
                <CheckoutStatePanel heading="Nothing to check out">
                    Your cart doesn’t have anything to pay for yet. Add a
                    product and come back.
                </CheckoutStatePanel>
            ) : error ? (
                <CheckoutStatePanel heading="Checkout Error">
                    An error occurred while preparing your checkout.
                    <br />
                    Please review your cart items and try again.
                </CheckoutStatePanel>
            ) : (
                <StripeCheckoutForm clientSecret={clientSecret} />
            )}
        </section>
    )
}
