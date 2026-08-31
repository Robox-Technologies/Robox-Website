import SummaryCard from '@/components/shop/summary/SummaryCard'
import { useCartEntries } from '@/features/shop/hooks/useCartEntries'
import { useCartTotals } from '@/features/shop/hooks/useCartTotals'
import type { Product } from '@/types/shop'
import CheckoutSummaryBody from './CheckoutSummaryBody'
import { SUMMARY_CARD_CLASS } from './summaryCardClass'
import { useShipping } from '../../hooks/useShipping'

/** The summary on the address step, before there is a session to read. */
export default function CheckoutSummaryCard({
    products,
}: {
    products: Product[]
}) {
    const { entries } = useCartEntries(products)
    const subtotalCents = useCartTotals(products)
    const { quote, loading, error, shippingInfo } = useShipping(products)

    return (
        <SummaryCard
            title="Order Summary"
            className={SUMMARY_CARD_CLASS}
            emptyMessage="Add products to build your checkout summary."
        >
            {entries.length > 0 ? (
                <CheckoutSummaryBody
                    subtotalCents={subtotalCents}
                    /* A quote without an address carries shipping: 0, which
                       isn't a real quote - keep saying "calculated at
                       checkout" until there is one. */
                    shippingCents={
                        shippingInfo ? (quote?.shipping ?? null) : null
                    }
                    shippingLoading={loading}
                    shippingError={error}
                    totalCents={quote?.total ?? subtotalCents}
                />
            ) : null}
        </SummaryCard>
    )
}
