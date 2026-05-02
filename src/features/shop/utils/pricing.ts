import type { Product } from '@/types/shop'
import type { CartItems } from '../types/cart'

export type CartTotals = {
    itemCount: number
    subtotalCents: number
}

export function calculateSubtotalCents(
    cart: CartItems | Record<string, number>,
    productsById: Record<string, Product>,
): CartTotals {
    return Object.entries(cart).reduce(
        (acc, [productId, value]) => {
            const product = productsById[productId]
            if (!product) {
                return acc
            }

            // Handle both CartItems (with .quantity property) and plain numbers
            const quantity = typeof value === 'object' ? value.quantity : value
            const safeQuantity = Math.max(0, Math.floor(quantity || 0))
            acc.itemCount += safeQuantity
            acc.subtotalCents += product.price * safeQuantity
            return acc
        },
        {
            itemCount: 0,
            subtotalCents: 0,
        } satisfies CartTotals,
    )
}
