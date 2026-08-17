import CartItemRow from './CartItemRow'
import type { CartEntry } from '../types/cart'

export default function CartItemsSection({
    title,
    items,
    imageSrcById,
    onInputChange,
    onRemove,
}: {
    /**
     * Optional: the original only labels the preorder group, so the
     * available items sit directly under the page heading.
     */
    title?: string
    items: CartEntry[]
    imageSrcById: Record<string, string>
    onInputChange: (productId: string, value: number) => void
    onRemove: (productId: string) => void
}) {
    if (items.length === 0) {
        return null
    }

    return (
        <section>
            {title ? (
                <h2 className="my-[20.75px] text-[25px] font-medium">
                    {title}
                </h2>
            ) : null}
            <div className="flex flex-col gap-8">
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
