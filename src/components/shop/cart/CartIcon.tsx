import Button from '@components/button'
import { faShoppingCart } from '@fortawesome/free-solid-svg-icons'
import { useEffect, useState } from 'react'
import { useCartQuantity } from '@features/shop/hooks/useCartQuantity'

export default function CartIcon() {
    const [mounted, setMounted] = useState(false)
    const quantityInCart = useCartQuantity()

    useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) {
        return null
    }

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
