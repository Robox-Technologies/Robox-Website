import { usePaymentID } from '@/features/shop/checkout/hooks/usePaymentID'
import type { Product } from '@/types/shop'
import StripeCheckoutForm from './CheckoutForm'
import CheckoutStatePanel from './CheckoutStatePanel'

export default function CheckoutPaymentSection({
    products,
}: {
    products: Product[]
}) {
    const { clientSecret, error } = usePaymentID(products)

    return (
        // The original's `#payment-card`: no card chrome of its own, grows to
        // fill the row, and holds a 675px floor so the column doesn't jump as
        // Stripe's elements come in.
        <section className="relative flex w-full flex-1 flex-col min-h-[675px]">
            {error && !clientSecret ? (
                <CheckoutStatePanel heading="Checkout Error">
                    An error occurred while preparing your checkout.
                    <br />
                    Please review your cart items and try again.
                </CheckoutStatePanel>
            ) : (
                /* Once there's a payment intent, keep the form mounted and
                   report failures inline. Swapping it out for a panel would
                   discard everything typed — and a rejected address (AusPost
                   404s on an incomplete postcode) is recoverable. */
                <StripeCheckoutForm clientSecret={clientSecret} error={error} />
            )}
        </section>
    )
}
