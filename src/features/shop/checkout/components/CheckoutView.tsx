import { useStore } from '@nanostores/react'
import type { Product } from '@/types/shop'
import { useCartTotals } from '@/features/shop/hooks/useCartTotals'
import { checkoutStep } from '../state/checkoutStore'
import CheckoutAddressSection from './address/CheckoutAddressSection'
import CheckoutRow from './CheckoutRow'
import CheckoutPaymentStep from './payment/CheckoutPaymentStep'
import CheckoutStatePanel from './payment/CheckoutStatePanel'
import CheckoutSummaryCard from './summary/CheckoutSummaryCard'

/** Stripe's floor for a charge; below it there is nothing to collect. */
const MINIMUM_CHARGE_CENTS = 50

/**
 * The whole checkout as one island. It owns both columns because the payment step
 * wraps them in a single `CheckoutElementsProvider`.
 */
export default function CheckoutView({ products }: { products: Product[] }) {
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

    if (step === 'payment') {
        return <CheckoutPaymentStep />
    }

    return (
        <CheckoutRow>
            <CheckoutAddressSection products={products} />
            <CheckoutSummaryCard products={products} />
        </CheckoutRow>
    )
}
