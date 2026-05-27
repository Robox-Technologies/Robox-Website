import { cartItems } from '@state/cartStore'
import { useStore } from '@nanostores/react'

export function useCartQuantity() {
    const currentCart = useStore(cartItems)

    return Object.values(currentCart).reduce((acc, item) => acc + item.quantity, 0)
}
