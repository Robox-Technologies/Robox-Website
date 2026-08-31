import { useStore } from '@nanostores/react'
import type { Product } from '@/types/shop'
import { useCartTotals } from '@/features/shop/hooks/useCartTotals'
import { checkoutStep } from '../state/checkoutStore'
import CheckoutAddressSection from './address/CheckoutAddressSection'
import CheckoutPaymentSection from './payment/CheckoutPaymentSection'
import CheckoutStatePanel from './payment/CheckoutStatePanel'

/** Stripe's floor for a charge; below it there is nothing to collect. */
const MINIMUM_CHARGE_CENTS = 50

/**
 * Owns which step of the checkout is showing. One island rather than two so
 * there is a single hydration boundary and a single loading fallback - two
 * `client:only` sections each rendering conditionally would resize the row as
 * they came in.
 *
 * The empty-cart check sits here rather than on the payment step: it applies to
 * both, and asking someone to type an address before telling them there is
 * nothing to buy is the wrong order.
 */
export default function CheckoutSteps({ products }: { products: Product[] }) {
    const step = useStore(checkoutStep)
    const subtotalCents = useCartTotals(products)

    if (subtotalCents < MINIMUM_CHARGE_CENTS) {
        return (
            <section className="relative flex w-full flex-1 flex-col min-h-[675px]">
                <CheckoutStatePanel heading="Nothing to check out">
                    Your cart doesn&apos;t have anything to pay for yet. Add a
                    product and come back.
                </CheckoutStatePanel>
            </section>
        )
    }

    return step === 'address' ? (
        <CheckoutAddressSection products={products} />
    ) : (
        <CheckoutPaymentSection products={products} />
    )
}
