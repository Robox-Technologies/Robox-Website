import SummaryCard from '@components/shop/summary/SummaryCard'
import { useCartEntries } from '@features/shop/hooks/useCartEntries'
import { useCartTotals } from '@features/shop/hooks/useCartTotals'
import { usePaymentID } from '@features/shop/checkout/hooks/usePaymentID'
import type { Product } from '@/types/shop'
import CheckoutSummaryBody from './CheckoutSummaryBody'
import StripeCheckoutForm from './StripeCheckoutForm'

export default function CheckoutView({ products }: { products: Product[] }) {
    const { entries } = useCartEntries(products)
    const subtotalCents = useCartTotals(products)
    const { clientSecret } = usePaymentID(products)
    const hasItems = entries.length > 0
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
        <div className="flex flex-col gap-8 lg:flex-row lg:items-stretch">
            <section className="flex w-full min-h-0 flex-1 flex-col gap-6 overflow-hidden lg:h-full lg:min-h-168 lg:overflow-visible">
                <StripeCheckoutForm clientSecret={clientSecret} />
            </section>
            <SummaryCard
                title="Order Summary"
                className="w-full lg:w-96 lg:shrink-0 lg:h-full"
                emptyMessage="Add products to build your checkout summary."
            >
                {hasItems ? <CheckoutSummaryBody lines={summaryLines} /> : null}
            </SummaryCard>
        </div>
    )
}