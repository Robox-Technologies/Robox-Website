import { useEffect, useState } from 'react'
import Button from '@components/button'
import { faShoppingCart } from '@fortawesome/free-solid-svg-icons'
import { cartItems } from '../utils/cart.client'
import { useStore } from '@nanostores/react'

export default function CartIcon() {
    const [mounted, setMounted] = useState(false)
    const $cartItems = useStore(cartItems)
    // TODO: Fix this on flash behaviour
    useEffect(() => {
        setMounted(true)
    }, [])

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
            type="button"
            icon={faShoppingCart}
            iconStyle="text-white"
            className={`relative rounded-full! text-white p-0! w-10 flex items-center justify-center h-10 ${quantityInCart > 0 ? 'ring-2 ring-red' : ''}`}
        >
            <span className="absolute -top-1 -right-1 bg-red border-white text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {quantityInCart}
            </span>
        </Button>
    )
}
