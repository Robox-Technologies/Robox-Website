import { actions } from 'astro:actions'
import { useStore } from '@nanostores/react'
import { useEffect, useState } from 'react'
import { cartItems } from '@/state/cartStore'
import type { Product } from '@/types/shop'

import {
    shippingAddress,
    shippingQuote,
} from '../state/shippingStore'

export function useShipping(products?: Product[]) {
    const currentCart = useStore(cartItems)
    const address = useStore(shippingAddress)
    const quote = useStore(shippingQuote)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!products) {
            setLoading(false)
            setError(null)
            return
        }

        const country = address?.country.trim()
        const postcode = address?.postcode.trim()

        if (!country || !postcode) {
            shippingQuote.set(null)
            setLoading(false)
            setError(null)
            return
        }

        let cancelled = false

        setLoading(true)
        setError(null)

        void (async () => {
            const result = await actions.getShippingQuote({
                products: currentCart,
                shippingInfo: {
                    country,
                    postcode,
                },
            })

            if (cancelled) {
                return
            }

            if (result.error) {
                shippingQuote.set(null)
                setError(result.error.message)
                setLoading(false)
                return
            }

            shippingQuote.set(result.data)
            setLoading(false)
        })()

        return () => {
            cancelled = true
        }
    }, [address?.country, address?.postcode, currentCart, products])

    return {
        quote,
        shippingInfo: address,
        setShippingInfo: shippingAddress.set,
        loading,
        error,
    }
}