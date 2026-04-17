import type { Product } from '@/types/shop'

type CartItems = Record<string, { quantity: number }>

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

            const quantity = Math.max(0, Number(cartValue.quantity || 0))
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