import { cartItems } from '@state/cartStore'
import { useStore } from '@nanostores/react'
import { useMemo } from 'react'
import type { SummaryLine } from '../components/shared/summaryCard'
import type { Product } from '@/types/shop'
import { calculateSubtotalCents } from '../utils/pricing'

function buildProductsById(products: Product[]) {
    return products.reduce(
        (acc, product) => {
            acc[product.internalName] = product
            return acc
        },
        {} as Record<string, Product>,
    )
}

export function useCartTotals(products: Product[]) {
    const currentCart = useStore(cartItems)

    const productsById = useMemo(() => buildProductsById(products), [products])

    return useMemo<SummaryLine[]>(() => {
        const totals = calculateSubtotalCents(currentCart, productsById)

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
    }, [currentCart, productsById])
}