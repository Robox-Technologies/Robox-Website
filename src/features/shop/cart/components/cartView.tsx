import CartEmptyState from './cartEmptyState'
import CartItemsSection from './CartItemsSection'
import SummaryCard from '@/components/shop/summary/SummaryCard'
import SummaryLineList from '@/components/shop/summary/SummaryLineList'
import { useCartEntries } from '../../hooks/useCartEntries'
import { useCartTotals } from '../../hooks/useCartTotals'
import type { Product } from '@/types/shop'
import CartSummaryFooter from './CartSummaryFooter'

export default function CartView({
    products,
    imageSrcById,
}: {
    products: Product[]
    imageSrcById: Record<string, string>
}) {
    const {
        entries,
        updateQuantity,
        removeItem,
    } = useCartEntries(products)
    const subtotalCents = useCartTotals(products)
    const showSummaryContent = entries.length > 0
    // The original lists preorder items under their own heading so it's clear
    // which part of the order ships later.
    const availableEntries = entries.filter(
        ({ product }) => product.status !== 'preorder',
    )
    const preorderEntries = entries.filter(
        ({ product }) => product.status === 'preorder',
    )
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

    // An empty cart replaces the whole two-column layout in the original,
    // rather than sitting beside a summary with nothing to summarise.
    if (!showSummaryContent) {
        return <CartEmptyState />
    }

    return (
        // A row that stacks below 900px: the item list grows, the summary is fixed beside it.
        <div className="flex flex-col gap-[50px] min-[1200px]:flex-row min-[1200px]:items-start">
            <div className="flex w-full flex-1 flex-col gap-16">
                <CartItemsSection
                    items={availableEntries}
                    imageSrcById={imageSrcById}
                    onInputChange={updateQuantity}
                    onRemove={removeItem}
                />
                <CartItemsSection
                    title="Preorder Now"
                    items={preorderEntries}
                    imageSrcById={imageSrcById}
                    onInputChange={updateQuantity}
                    onRemove={removeItem}
                />
            </div>

            <div className="w-full min-[1200px]:w-96 min-[1200px]:shrink-0">
                <SummaryCard title="Order Summary" className="w-full">
                    <SummaryLineList lines={summaryLines} />
                    <CartSummaryFooter />
                </SummaryCard>
            </div>
        </div>
    )
}
