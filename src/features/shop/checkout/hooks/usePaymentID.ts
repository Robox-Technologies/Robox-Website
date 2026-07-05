import { actions } from 'astro:actions'
import { useStore } from '@nanostores/react'
import { cartItems } from '@/state/cartStore'
import { useEffect, useRef, useState } from 'react'
import type { Product } from '@/types/shop'
import { useCartTotals } from '@/features/shop/hooks/useCartTotals'
import { shippingAddress } from '../state/shippingStore'

function buildSyncKey(
    subtotalCents: number,
    shippingInfo: { country: string; postcode: string } | null,
    currentCart: Record<string, { quantity: number } | number>,
) {
    const shippingKey = shippingInfo
        ? `${shippingInfo.country.trim().toUpperCase()}:${shippingInfo.postcode.trim()}`
        : 'no-shipping'

    const cartKey = Object.entries(currentCart)
        .map(([productKey, value]) => {
            const quantity =
                typeof value === 'number' ? value : value.quantity

            return `${productKey}:${quantity}`
        })
        .sort()
        .join(',')

    return `${subtotalCents}:${shippingKey}:${cartKey}`
}

export function usePaymentID(products: Product[]) {
    const currentCart = useStore(cartItems)
    const shippingInfo = useStore(shippingAddress)
    const subtotalCents = useCartTotals(products)
    const [paymentID, setPaymentID] = useState<string | null>(null)
    const [clientSecret, setClientSecret] = useState<string | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const lastSyncedKeyRef = useRef<string | null>(null)

    useEffect(() => {
        if (subtotalCents < 50) {
            setPaymentID(null)
            setClientSecret(null)
            setLoading(false)
            setError(null)
            lastSyncedKeyRef.current = null
            return
        }

        const syncKey = buildSyncKey(subtotalCents, shippingInfo, currentCart)

        if (paymentID && lastSyncedKeyRef.current === syncKey) {
            return
        }

        let cancelled = false

        setLoading(true)
        setError(null)

        void (async () => {
            if (paymentID) {
                const result = await actions.updatePaymentIntent({
                    paymentIntentId: paymentID,
                    products: currentCart,
                    shippingInfo: shippingInfo ?? null,
                })

                if (cancelled) {
                    return
                }

                if (result.error) {
                    setError(result.error.message)
                    setLoading(false)
                    return
                }

                setPaymentID(result.data.id)
                lastSyncedKeyRef.current = syncKey
                setLoading(false)
                return
            }

            const result = await actions.createPaymentIntent({
                products: currentCart,
                shippingInfo: shippingInfo ?? null,
                cost: subtotalCents,
            })

            if (cancelled) {
                return
            }

            if (result.error) {
                setError(result.error.message)
                setLoading(false)
                return
            }

            setPaymentID(result.data.id)
            setClientSecret(result.data.clientSecret)
            lastSyncedKeyRef.current = syncKey
            setLoading(false)
        })()

        return () => {
            cancelled = true
        }
    }, [currentCart, paymentID, shippingInfo, subtotalCents])

    return {
        paymentID,
        clientSecret,
        loading,
        error,
    }
}