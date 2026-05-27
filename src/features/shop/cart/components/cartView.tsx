import CartEmptyState from './cartEmptyState'
import CartItemsSection from './CartItemsSection'
import SummaryCard from '@components/shop/summary/SummaryCard'
import SummaryLineList from '@components/shop/summary/SummaryLineList'
import { useCartEntries } from '../../hooks/useCartEntries'
import { useCartTotals } from '../../hooks/useCartTotals'
import type { Product } from '@/types/shop'
import { useEffect, useState } from 'react'
import CartSummaryFooter from './CartSummaryFooter'

export default function CartView({
    products,
    imageSrcById,
}: {
    products: Product[]
    imageSrcById: Record<string, string>
}) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const {
        entries,
        updateQuantity,
        removeItem,
    } = useCartEntries(products)
    const subtotalCents = useCartTotals(products)
    const showSummaryContent = mounted && entries.length > 0
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

    if (!mounted) {
        return (
            <div className="flex h-full flex-col gap-8 lg:flex-row lg:items-stretch">
                <div className="flex w-full flex-1 flex-col gap-6 rounded-xl border border-black/10 bg-white p-6 shadow-sm lg:h-full lg:overflow-y-auto">
                    <div className="flex min-h-72 flex-col items-center justify-center gap-3 text-center">
                        <h2 className="mb-0! text-3xl font-bold">
                            Loading cart...
                        </h2>
                    </div>
                </div>

                <div className="w-full lg:h-full lg:w-96 lg:shrink-0">
                    <SummaryCard
                        title="Order Summary"
                        className="w-full lg:h-full"
                        emptyMessage="Add products to build your checkout summary."
                    >
                        {showSummaryContent ? (
                            <>
                                <SummaryLineList lines={summaryLines} />
                                <CartSummaryFooter />
                            </>
                        ) : null}
                    </SummaryCard>
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-full flex-col gap-8 lg:flex-row lg:items-stretch">
            <div className="flex w-full flex-1 flex-col gap-6 rounded-xl border border-black/10 bg-white p-6 shadow-sm lg:h-full lg:overflow-y-auto">
                {entries.length === 0 ? (
                    <CartEmptyState />
                ) : (
                    <CartItemsSection
                        title="Cart Items"
                        items={entries}
                        imageSrcById={imageSrcById}
                        onInputChange={updateQuantity}
                        onRemove={removeItem}
                    />
                )}
            </div>

            <div className="w-full lg:h-full lg:w-96 lg:shrink-0">
                <SummaryCard
                    title="Order Summary"
                    className="w-full lg:h-full"
                    emptyMessage="Add products to build your checkout summary."
                >
                    {showSummaryContent ? (
                        <>
                            <SummaryLineList lines={summaryLines} />
                            <CartSummaryFooter />
                        </>
                    ) : null}
                </SummaryCard>
            </div>
        </div>
    )
}
