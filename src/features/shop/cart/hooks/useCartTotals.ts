import { cartItems } from '@state/cartStore'
import { useStore } from '@nanostores/react'
import type { Product } from '@/types/shop'
import { calculateSubtotalCents } from '../utils/pricing'

export function useCartTotals(products: Product[]) {
    const currentCart = useStore(cartItems)

    const totals = calculateSubtotalCents(currentCart, products)

    return [
        {
            id: 'subtotal',
            label: 'Subtotal',
            amountCents: totals.subtotalCents,
        },
        {
            id: 'total',
            label: 'Total',
            amountCents: totals.subtotalCents,
            highlighted: true,
        },
    ]
}
