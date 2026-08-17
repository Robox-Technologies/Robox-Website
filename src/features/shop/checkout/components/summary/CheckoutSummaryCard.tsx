import SummaryCard from '@/components/shop/summary/SummaryCard'
import { useCartEntries } from '@/features/shop/hooks/useCartEntries'
import { useCartTotals } from '@/features/shop/hooks/useCartTotals'
import type { Product } from '@/types/shop'
import CheckoutSummaryBody from './CheckoutSummaryBody'
import { useShipping } from '../../hooks/useShipping'

export default function CheckoutSummaryCard({
    products,
}: {
    products: Product[]
}) {
    const { entries } = useCartEntries(products)
    const subtotalCents = useCartTotals(products)
    const { quote, loading, error, shippingInfo } = useShipping(products)
    const summaryLines = [
        {
            id: 'subtotal',
            label: 'Subtotal',
            amountCents: subtotalCents,
        },
        {
            id: 'total',
            label: 'Total',
            amountCents: quote?.total ?? subtotalCents,
            highlighted: true,
        },
    ]

    return (
        <SummaryCard
            title="Order Summary"
            className="w-full min-[900px]:w-96 min-[900px]:shrink-0"
            emptyMessage="Add products to build your checkout summary."
        >
            {entries.length > 0 ? (
                <CheckoutSummaryBody
                    lines={summaryLines}
                    /* A voucher can be priced without an address, and that
                       quote carries shipping: 0 — which isn't a real quote, so
                       keep saying "calculated at checkout" until we have one. */
                    shippingCents={
                        shippingInfo ? (quote?.shipping ?? null) : null
                    }
                    shippingLoading={loading}
                    shippingError={error}
                    discountCents={quote?.discount ?? 0}
                    discountStatus={quote?.discountStatus ?? 'unset'}
                />
            ) : null}
        </SummaryCard>
    )
}