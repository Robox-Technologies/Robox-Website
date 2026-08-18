import AddQuantity from '@/components/shop/purchase/AddQuantity'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrash } from '@fortawesome/free-solid-svg-icons'
import { formatPrice } from '@/utils/formatPrice'
import type { Product } from '@/types/shop'

/**
 * Mirrors the original's `.cart-item`: a 100px-tall row of thumbnail, then a
 * name / line-total / unit-price stack, with the delete button and the quantity
 * stepper pinned to the right edge. The card background is this site's own
 * addition — the original separated rows with a rule instead.
 */
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
        <div className="rounded-lg border border-black/10 p-4 bg-white">
            <div className="flex h-25 flex-row gap-5 max-[600px]:h-auto max-[600px]:flex-col">
                <img
                    src={imageSrc}
                    // Decorative: the row names the product right beside it.
                    alt=""
                    className="h-full aspect-video shrink-0 rounded-[5px] object-cover max-[600px]:h-auto max-[600px]:w-full"
                />
                <div className="flex min-w-0 flex-1 flex-row items-start justify-between gap-4">
                    {/* `min-w-0` on both columns: without it each one holds its
                        min-content width and the stepper and bin overhang the
                        card on a phone. */}
                    <div className="flex h-full min-w-0 flex-col items-start justify-between">
                        <p className="mb-0! text-lg">{item.name}</p>
                        <p className="mb-0! text-3xl font-bold">
                            {formatPrice(item.price * quantity)}
                        </p>
                        <p className="mb-0! text-sm">
                            {formatPrice(item.price)}/each
                        </p>
                    </div>

                    <div className="flex min-w-0 flex-col items-end justify-between gap-8">
                        <button
                            type="button"
                            aria-label={`Remove ${item.name} from cart`}
                            className="button-interactive text-red"
                            onClick={onRemove}
                        >
                            <FontAwesomeIcon
                                icon={faTrash}
                                className="text-[25px]"
                            />
                        </button>

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
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
