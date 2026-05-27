import { actions } from 'astro:actions'
import { cartItems } from '@state/cartStore'
import { useEffect, useState } from 'react'
import type { Product } from '@/types/shop'
import { useCartTotals } from '@features/shop/hooks/useCartTotals'

type ShippingAddress = {
    country: string
    postcode: string
}

export function usePaymentID(
    products: Product[],
    shippingInfo?: ShippingAddress | null,
) {
    const currentCart = cartItems.get()
    const subtotalCents = useCartTotals(products)
    const [paymentID, setPaymentID] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (subtotalCents < 50) {
            setPaymentID(null)
            setLoading(false)
            setError(null)
            return
        }

        let cancelled = false

        setLoading(true)
        setError(null)

        void (async () => {
            const result = await actions.createPaymentIntent({
                products: currentCart,
                shippingInfo: shippingInfo ?? null,
                cost: subtotalCents,
            })

            if (cancelled) {
                return
            }

            if (result.error) {
                setPaymentID(null)
                setError(result.error.message)
                setLoading(false)
                return
            }

            setPaymentID(result.data.id)
            setLoading(false)
        })()

        return () => {
            cancelled = true
        }
    }, [currentCart, shippingInfo, subtotalCents])

    return {
        paymentID,
        loading,
        error,
    }
}