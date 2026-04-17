import Button from '@components/button'
import CartItem from '@features/cart/components/cartItem'
import type { ProductWithImage } from '@features/cart/types/cart'
import AddQuantity from '@features/shop/components/purchaseFlow/addQuantity'

export default function CartItemRow({
    item,
    quantity,
    onIncrease,
    onDecrease,
    onInputChange,
    onRemove,
}: {
    item: ProductWithImage
    quantity: number
    onIncrease: () => void
    onDecrease: () => void
    onInputChange: (value: number) => void
    onRemove: () => void
}) {
    return (
        <div className="rounded-lg border border-black/10 p-4">
            <CartItem
                product={item}
                quantity={quantity}
                imageSrc={item.imageSrc}
            />
            <div className="mt-4 flex flex-wrap items-center justify-between gap-4">
                <AddQuantity
                    quantity={quantity}
                    setQuantity={(nextValue) => {
                        const resolvedValue =
                            typeof nextValue === 'function'
                                ? nextValue(quantity)
                                : nextValue
                        onInputChange(resolvedValue)
                    }}
                    submitToCart={false}
                    className="w-auto"
                />
                <Button
                    type="button"
                    className="bg-black text-white hover:bg-black/80"
                    onClick={onRemove}
                >
                    Remove
                </Button>
            </div>
        </div>
    )
}