import { cartItems } from '@state/cartStore'
import { useStore } from '@nanostores/react'
import type { Product } from '@/types/shop'
import { calculateSubtotalCents } from '../cart/utils/pricing'

export function useCartTotals(products: Product[]) {
    const currentCart = useStore(cartItems)

    const totals = calculateSubtotalCents(currentCart, products)

    return totals.subtotalCents
}
