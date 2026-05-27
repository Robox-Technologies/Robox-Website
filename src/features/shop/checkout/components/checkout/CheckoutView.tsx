import SummaryCard from '@components/shop/summary/SummaryCard'
import { useCartEntries } from '@features/shop/hooks/useCartEntries'
import { useCartTotals } from '@features/shop/hooks/useCartTotals'
import type { Product } from '@/types/shop'
import { useEffect, useState } from 'react'
import CheckoutLoadingState from './CheckoutLoadingState'
import CheckoutSummaryBody from './CheckoutSummaryBody'
import StripeCheckoutPlaceholder from './StripeCheckoutPlaceholder'

export default function CheckoutView({ products }: { products: Product[] }) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const { entries } = useCartEntries(products)
    const subtotalCents = useCartTotals(products)
    const hasItems = mounted && entries.length > 0
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
        <div className="flex h-full flex-col gap-8 lg:flex-row lg:items-start">
            <div className="flex w-full flex-1 flex-col gap-6 rounded-xl border border-black/10 bg-white p-6 shadow-sm lg:min-h-168 lg:overflow-y-auto">
                {mounted ? <StripeCheckoutPlaceholder                     /> : <CheckoutLoadingState />}
            </div>

            <div className="w-full lg:w-96 lg:shrink-0 lg:self-stretch">
                <SummaryCard
                    title="Order Summary"
                    className="w-full lg:min-h-168"
                    emptyMessage="Add products to build your checkout summary."
                >
                    {hasItems ? (
                        <CheckoutSummaryBody lines={summaryLines} />
                    ) : null}
                </SummaryCard>
            </div>
        </div>
    )
}