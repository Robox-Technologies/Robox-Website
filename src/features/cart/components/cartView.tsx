import CartEmptyState from '@features/cart/components/cartEmptyState'
import CartItemsSection from '@features/cart/components/cartItemsSection'
import CartSummary, {
    SummaryPrimaryAction,
} from '@features/cart/components/cartSummary'
import { useCartViewModel } from '@features/cart/hooks/useCartViewModel'
import type { ProductWithImage } from '@features/cart/types/cart'
import { useEffect, useState } from 'react'

export default function CartView({
    products,
}: {
    products: ProductWithImage[]
}) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const {
        activeEntries,
        availableItems,
        preorderItems,
        summaryLines,
        updateQuantity,
        removeItem,
    } = useCartViewModel(products)

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
                        <CartItemsSection
                            title="Available Now"
                            items={availableItems}
                            onIncrease={(productId, quantity) =>
                                updateQuantity(productId, quantity + 1)
                            }
                            onDecrease={(productId, quantity) =>
                                updateQuantity(productId, quantity - 1)
                            }
                            onInputChange={updateQuantity}
                            onRemove={removeItem}
                        />
                        <CartItemsSection
                            title="Preorder Now"
                            items={preorderItems}
                            onIncrease={(productId, quantity) =>
                                updateQuantity(productId, quantity + 1)
                            }
                            onDecrease={(productId, quantity) =>
                                updateQuantity(productId, quantity - 1)
                            }
                            onInputChange={updateQuantity}
                            onRemove={removeItem}
                        />
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