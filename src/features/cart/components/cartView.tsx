import CartEmptyState from '@features/cart/components/cartEmptyState'
import CartItemsSection from '@features/cart/components/cartItemsSection'
import CartSummary, {
    SummaryPrimaryAction,
} from '@features/cart/components/cartSummary'
import { useHydrated } from '@features/cart/hooks/useHydrated'
import { useCartViewModel } from '@features/cart/hooks/useCartViewModel'
import type { ProductWithImage } from '@features/cart/types/cart'

export default function CartView({
    products,
}: {
    products: ProductWithImage[]
}) {
    const mounted = useHydrated()

    const {
        activeEntries,
        availableItems,
        preorderItems,
        summaryLines,
        updateQuantity,
        incrementQuantity,
        decrementQuantity,
        removeItem,
    } = useCartViewModel(products)

    const sections = [
        { title: 'Available Now', items: availableItems },
        { title: 'Preorder Now', items: preorderItems },
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
                    <CartSummary
                        className="w-full lg:h-full"
                        lines={[]}
                        emptyMessage="Add products to build your checkout summary."
                    />
                </div>
            </div>
        )
    }

    return (
        <div className="flex h-full flex-col gap-8 lg:flex-row lg:items-stretch">
            <div className="flex w-full flex-1 flex-col gap-6 rounded-xl border border-black/10 bg-white p-6 shadow-sm lg:h-full lg:overflow-y-auto">
                {activeEntries.length === 0 ? (
                    <CartEmptyState />
                ) : (
                    <>
                        {sections.map((section) => (
                            <CartItemsSection
                                key={section.title}
                                title={section.title}
                                items={section.items}
                                onIncrease={incrementQuantity}
                                onDecrease={decrementQuantity}
                                onInputChange={updateQuantity}
                                onRemove={removeItem}
                            />
                        ))}
                    </>
                )}
            </div>

            <div className="w-full lg:h-full lg:w-96 lg:shrink-0">
                <CartSummary
                    className="w-full lg:h-full"
                    lines={activeEntries.length > 0 ? summaryLines : []}
                    emptyMessage="Add products to build your checkout summary."
                    footer={
                        activeEntries.length > 0 ? (
                            <div className="flex flex-col gap-4">
                                <p className="mb-0 text-sm text-gray-600">
                                    Shipping calculated at checkout.
                                </p>
                                <p className="mb-0 text-sm text-gray-600">
                                    Bulk order? Please email us at{' '}
                                    <a
                                        href="mailto:hello@robox.com.au"
                                        className="font-semibold text-blue hover:underline"
                                    >
                                        hello@robox.com.au
                                    </a>{' '}
                                    for invoicing.
                                </p>
                                <SummaryPrimaryAction disabled>
                                    Checkout Coming Soon
                                </SummaryPrimaryAction>
                            </div>
                        ) : null
                    }
                />
            </div>
        </div>
    )
}