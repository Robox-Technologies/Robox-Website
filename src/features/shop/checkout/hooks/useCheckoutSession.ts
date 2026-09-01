import { actions } from 'astro:actions'
import { useStore } from '@nanostores/react'
import { useEffect, useRef, useState } from 'react'
import { cartItems } from '@/state/cartStore'
import { shippingDetails, shippingServiceId } from '../state/checkoutStore'

/**
 * Identifies the order a session was created for. A change here means the
 * session no longer describes what the customer is buying.
 */
function buildSessionKey(
    cart: Record<string, { quantity: number } | number>,
    details: ReturnType<typeof shippingDetails.get>,
    serviceId: string,
) {
    const cartKey = Object.entries(cart)
        .map(([productKey, value]) => {
            const quantity = typeof value === 'number' ? value : value.quantity
            return `${productKey}:${quantity}`
        })
        .sort()
        .join(',')

    const addressKey = details
        ? `${details.address.country}:${details.address.postal_code}`
        : 'no-address'

    return `${cartKey}|${addressKey}|${serviceId}`
}

/**
 * Creates the Checkout Session the payment step runs on, and replaces it when
 * the order changes.
 *
 * Replacing rather than updating is deliberate: `payment_intent_data` is fixed
 * at creation and carries the figures the receipt reads, so an edited session
 * would charge one amount and email another. The cart can't be edited from the
 * payment step, so in practice this only fires if another tab changes it.
 */
export function useCheckoutSession() {
    const cart = useStore(cartItems)
    const details = useStore(shippingDetails)
    const serviceId = useStore(shippingServiceId)
    const [clientSecret, setClientSecret] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const requestedKeyRef = useRef<string | null>(null)

    useEffect(() => {
        if (!details) return

        const sessionKey = buildSessionKey(cart, details, serviceId)
        if (requestedKeyRef.current === sessionKey) return
        requestedKeyRef.current = sessionKey

        let cancelled = false
        setError(null)

        void (async () => {
            const result = await actions.createCheckoutSession({
                products: cart,
                shippingDetails: details,
                shippingServiceId: serviceId,
            })

            if (cancelled) return

            if (result.error) {
                // Let the next change retry rather than pinning the failed key.
                requestedKeyRef.current = null
                setError(result.error.message)
                return
            }

            setClientSecret(result.data.clientSecret)
        })()

        return () => {
            cancelled = true
        }
    }, [cart, details, serviceId])

    return { clientSecret, error }
}
