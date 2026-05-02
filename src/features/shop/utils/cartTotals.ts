import type { Product } from '@/types/shop'
import type { CartItems } from '../types/cart'
import { clampQuantity } from './quantity'

export type CartTotals = {
    itemCount: number
    subtotalCents: number
}

export function getCartTotals(
    cart: CartItems,
    productsById: Record<string, Product>,
): CartTotals {
    return Object.entries(cart).reduce(
        (acc, [productId, cartValue]) => {
            const product = productsById[productId]
            if (!product) {
                return acc
            }

            const quantity = clampQuantity(cartValue.quantity)
            acc.itemCount += quantity
            acc.subtotalCents += product.price * quantity
            return acc
        },
        {
            itemCount: 0,
            subtotalCents: 0,
        } satisfies CartTotals,
    )
}