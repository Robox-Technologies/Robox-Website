import { cartItems } from '@state/cartStore'
import { removeFromCart, setCartQuantity } from '@state/cartActions'
import { useStore } from '@nanostores/react'
import type { Product } from '@/types/shop'
import type { CartEntry } from '../cart/types/cart'
import { clampQuantity } from '../cart/utils/quantity'

export function useCartEntries(products: Product[]) {
    const currentCart = useStore(cartItems)

    const entries: CartEntry[] = Object.entries(currentCart)
        .flatMap(([productId, { quantity }]) => {
            const product = products.find(
                ({ internalName }) => internalName === productId,
            )
            if (!product) {
                return []
            }

            const safeQuantity = clampQuantity(Number(quantity || 0))
            if (safeQuantity === 0) {
                return []
            }

            return [
                {
                    product,
                    quantity: safeQuantity,
                },
            ]
        })

    const updateQuantity = (productId: string, nextValue: number) => {
        setCartQuantity(productId, clampQuantity(nextValue))
    }

    const removeItem = (productId: string) => {
        removeFromCart(productId)
    }

    return {
        entries,
        updateQuantity,
        removeItem,
    }
}
