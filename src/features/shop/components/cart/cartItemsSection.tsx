import CartItemRow from './cartItemRow'
import type { CartEntry } from '../../types/cart'

export default function CartItemsSection({
    title,
    items,
    imageSrcById,
    onInputChange,
    onRemove,
}: {
    title: string
    items: CartEntry[]
    imageSrcById: Record<string, string>
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
                        imageSrc={imageSrcById[product.internalName]}
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