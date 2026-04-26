import Button from '@components/button'
import { faMinus, faPlus } from '@fortawesome/free-solid-svg-icons'
import { addToCart } from '@features/cart/utils/cart.client'
import {
    clampQuantity,
    decrementQuantity,
    incrementQuantity,
} from '@features/cart/utils/quantity'
import { toast } from '@libs/ui/toast'
import clsx from 'clsx'
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

        if (quantity <= 0) {
            toast.warning({
                title: 'Quantity Needed',
                message: 'Choose at least one item before adding to cart.',
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
            className={clsx(`flex flex-row items-center gap-0 w-64`, className)}
        >
            <Button
                type="button"
                icon={faMinus}
                iconStyle="text-black"
                className="rounded-l-full! border-2 p-0! w-10 border-black flex items-center justify-center h-10"
                onClick={decrement}
            />
            <input
                type="number"
                className="w-30 text-xl text-center border-y-2 border-black h-10 no-spinner"
                value={quantity.toString()}
                min={0}
                onChange={onChangeHandler}
            />
            <Button
                type="button"
                icon={faPlus}
                iconStyle="text-black"
                className="rounded-r-full! border-2 border-black p-0! w-10 flex text-center items-center justify-center h-10"
                onClick={increment}
            />
        </form>
    )
}
