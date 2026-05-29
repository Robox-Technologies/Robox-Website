import SummaryCard from '@components/shop/summary/SummaryCard'
import { useCartEntries } from '@features/shop/hooks/useCartEntries'
import { useCartTotals } from '@features/shop/hooks/useCartTotals'
import type { Product } from '@/types/shop'
import CheckoutSummaryBody from './CheckoutSummaryBody'

export default function CheckoutSummaryCard({
    products,
}: {
    products: Product[]
}) {
    const { entries } = useCartEntries(products)
    const subtotalCents = useCartTotals(products)
    const summaryLines = [
        {
            id: 'subtotal',
            label: 'Subtotal',
            amountCents: subtotalCents,
        },
        {
            id: 'total',
            label: 'Total',
            amountCents: subtotalCents,
            highlighted: true,
        },
    ]

    return (
        <SummaryCard
            title="Order Summary"
            className="w-full lg:w-96 lg:shrink-0 lg:h-full"
            emptyMessage="Add products to build your checkout summary."
        >
            {entries.length > 0 ? (
                <CheckoutSummaryBody lines={summaryLines} />
            ) : null}
        </SummaryCard>
    )
}