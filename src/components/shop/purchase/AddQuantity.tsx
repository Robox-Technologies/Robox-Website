import Button from '@/components/button'
import { faMinus, faPlus } from '@fortawesome/free-solid-svg-icons'
import { addToCart } from '@/state/cartActions'
import {
    CART_MAX_QUANTITY,
    CART_MIN_QUANTITY,
    clampQuantity,
    decrementQuantity,
    incrementQuantity,
} from '@/features/shop/cart/utils/quantity'
import { toast } from '@/libs/ui/toast'
import { twMerge } from 'tailwind-merge'
import type { FormHTMLAttributes } from 'react'

export default function AddQuantity({
    quantity,
    setQuantity,
    submitToCart = true,
    className,
    ...props
}: FormHTMLAttributes<HTMLFormElement> & {
    quantity: number
    setQuantity: React.Dispatch<React.SetStateAction<number>>
    submitToCart?: boolean
}) {
    const onChangeHandler = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuantity(clampQuantity(e.target.value))
    }
    const increment = () => {
        setQuantity((prev) => incrementQuantity(prev))
    }
    const decrement = () => {
        setQuantity((prev) => decrementQuantity(prev))
    }
    const onSubmit = (e: React.SubmitEvent<HTMLFormElement>) => {
        e.preventDefault()

        if (!submitToCart) {
            return
        }

        const productId =
            (e.currentTarget as HTMLFormElement).getAttribute(
                'data-product-id',
            ) || ''

        if (!productId) {
            toast.danger({
                title: 'Cart Error',
                message: 'Unable to add this item to cart right now.',
            })
            return
        }

        if (quantity < CART_MIN_QUANTITY) {
            toast.warning({
                title: 'Quantity Needed',
                message: 'Please choose at least one item before adding to cart.',
            })
            return
        }

        addToCart(productId, quantity)
        toast.success({
            title: 'Added to Cart',
            message: `Added ${quantity} item${quantity === 1 ? '' : 's'} to your cart.`,
            durationMs: 3500,
        })
    }
    return (
        <form
            {...props}
            onSubmit={onSubmit}
            className={twMerge(
                `flex flex-row items-center gap-0 w-50 h-[37px]`,
                className,
            )}
        >
            <Button
                type="button"
                icon={faMinus}
                iconStyle="text-black text-sm"
                className="rounded-l-full! rounded-r-none! bg-white border-2 border-r-0 p-0! w-[30px] border-black flex items-center justify-center h-full"
                onClick={decrement}
            />
            <input
                type="number"
                className="w-35 text-xl text-center text-black border-2 border-black h-full no-spinner"
                value={quantity.toString()}
                min={CART_MIN_QUANTITY}
                max={CART_MAX_QUANTITY}
                onChange={onChangeHandler}
            />
            <Button
                type="button"
                icon={faPlus}
                iconStyle="text-black text-sm"
                className="rounded-r-full! rounded-l-none! bg-white border-2 border-l-0 border-black p-0! w-[30px] flex text-center items-center justify-center h-full"
                onClick={increment}
            />
        </form>
    )
}
