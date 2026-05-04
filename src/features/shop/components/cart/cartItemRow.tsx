import Button from '@components/button'
import CartItem from './cartItem'
import AddQuantity from '../purchaseFlow/addQuantity'
import type { Product } from '@/types/shop'

export default function CartItemRow({
    item,
    quantity,
    imageSrc,
    onInputChange,
    onRemove,
}: {
    item: Product
    quantity: number
    imageSrc: string
    onInputChange: (value: number) => void
    onRemove: () => void
}) {
    return (
        <div className="rounded-lg border border-black/10 p-4">
            <CartItem
                product={item}
                quantity={quantity}
                imageSrc={imageSrc}
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