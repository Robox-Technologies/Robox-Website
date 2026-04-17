import CartItemRow from '@features/cart/components/cartItemRow'
import type { CartEntry } from '@features/cart/types/cart'

export default function CartItemsSection({
    title,
    items,
    onIncrease,
    onDecrease,
    onInputChange,
    onRemove,
}: {
    title: string
    items: CartEntry[]
    onIncrease: (productId: string, quantity: number) => void
    onDecrease: (productId: string, quantity: number) => void
    onInputChange: (productId: string, value: number) => void
    onRemove: (productId: string) => void
}) {
    if (items.length === 0) {
        return null
    }

    return (
        <section className="flex flex-col gap-4">
            <h2 className="mb-0! text-2xl font-semibold">{title}</h2>
            <div className="flex flex-col gap-4">
                {items.map(({ product, quantity }) => (
                    <CartItemRow
                        key={product.internalName}
                        item={product}
                        quantity={quantity}
                        onIncrease={() =>
                            onIncrease(product.internalName, quantity)
                        }
                        onDecrease={() =>
                            onDecrease(product.internalName, quantity)
                        }
                        onInputChange={(value) =>
                            onInputChange(product.internalName, value)
                        }
                        onRemove={() => onRemove(product.internalName)}
                    />
                ))}
            </div>
        </section>
    )
}