import Button from '@components/button'
import { faShoppingCart } from '@fortawesome/free-solid-svg-icons'
import { cartItems } from '../utils/cart.client'
import { useStore } from '@nanostores/react'
import { useHydrated } from '@features/cart/hooks/useHydrated'

export default function CartIcon() {
    const mounted = useHydrated()
    const $cartItems = useStore(cartItems)

    if (!mounted) {
        // SSR + first client render match → no mismatch
        return null
    }

    const quantityInCart = Object.values($cartItems).reduce(
        (acc, item) => acc + item.quantity,
        0,
    )
    if (quantityInCart === 0) {
        return null
    }
    return (
        <Button
            href="/shop/cart"
            icon={faShoppingCart}
            iconStyle="text-white"
            className={`relative rounded-full! text-white p-0! w-10 flex items-center justify-center h-10`}
        >
            <span className="absolute -top-1 -right-1 bg-red border-white text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {quantityInCart}
            </span>
        </Button>
    )
}
