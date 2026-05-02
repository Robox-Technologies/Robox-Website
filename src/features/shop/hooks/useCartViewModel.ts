import type { SummaryLine } from '../components/shared/summaryCard'
import type { CartEntry, ProductWithImage } from '../types/cart'
import {
    cartItems,
    removeFromCart,
    setCartQuantity,
} from '../state/cart.client'
import { clampQuantity } from '../utils/quantity'
import { getCartTotals } from '../utils/cartTotals'
import { toast } from '@libs/ui/toast'
import { useStore } from '@nanostores/react'
import { useEffect, useMemo } from 'react'

export function useCartViewModel(products: ProductWithImage[]) {
    const currentCart = useStore(cartItems)

    const productsById = useMemo(
        () =>
            products.reduce(
                (acc, product) => {
                    acc[product.internalName] = product
                    return acc
                },
                {} as Record<string, ProductWithImage>,
            ),
        [products],
    )

    useEffect(() => {
        const invalidIds = Object.keys(currentCart).filter((id) => {
            const product = productsById[id]
            return !product || product.status === 'not-available'
        })

        if (invalidIds.length === 0) {
            return
        }

        for (const id of invalidIds) {
            removeFromCart(id)
        }

        toast.informative({
            title: 'Cart updated',
            message: 'Unavailable items were removed from your cart.',
            durationMs: 3000,
        })
    }, [currentCart, productsById])

    const activeEntries = useMemo<CartEntry[]>(() => {
        return Object.entries(currentCart)
            .map(([productId, { quantity }]) => {
                const product = productsById[productId]
                if (!product) {
                    return null
                }

                const safeQuantity = clampQuantity(Number(quantity || 0))
                if (safeQuantity === 0) {
                    return null
                }

                return {
                    product,
                    quantity: safeQuantity,
                }
            })
            .filter((value): value is CartEntry => Boolean(value))
    }, [currentCart, productsById])

    const availableItems = activeEntries.filter(
        ({ product }) => product.status === 'available',
    )
    const preorderItems = activeEntries.filter(
        ({ product }) => product.status === 'preorder',
    )

    const totals = getCartTotals(currentCart, productsById)
    const summaryLines: SummaryLine[] = [
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

    const updateQuantity = (productId: string, nextValue: number) => {
        setCartQuantity(productId, clampQuantity(nextValue))
    }

    const removeItem = (productId: string) => {
        removeFromCart(productId)
    }

    return {
        activeEntries,
        availableItems,
        preorderItems,
        summaryLines,
        updateQuantity,
        removeItem,
    }
}
