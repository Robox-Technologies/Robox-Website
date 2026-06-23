import { actions } from 'astro:actions'
import { useStore } from '@nanostores/react'
import { useEffect, useState } from 'react'
import { cartItems } from '@/state/cartStore'

type ShippingAddress = {
    country: string
    postcode: string
}

type ShippingQuote = {
    subtotal: number
    shipping: number
    total: number
    currency: 'aud'
}

export function useShipping(address: ShippingAddress | null) {
    const currentCart = useStore(cartItems)
    const [quote, setQuote] = useState<ShippingQuote | null>(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const country = address?.country.trim()
        const postcode = address?.postcode.trim()

        if (!country || !postcode) {
            setQuote(null)
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
                setQuote(null)
                setError(result.error.message)
                setLoading(false)
                return
            }

            setQuote(result.data)
            setLoading(false)
        })()

        return () => {
            cancelled = true
        }
    }, [address?.country, address?.postcode, currentCart])

    return {
        quote,
        loading,
        error,
    }
}