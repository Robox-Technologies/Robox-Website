/**
 * The order the emails render, built off a Checkout Session.
 *
 * The postage line is the delicate part: it rides in as an ordinary line item
 * so the wallets don't collect an address, so the summary has to pull it back
 * out. When that failed it failed silently and plausibly - the receipt billed
 * postage as an item called "Shipping" and then charged AU$0.00 for shipping.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Stripe } from 'stripe'

import { SHIPPING_PRODUCT_MARKER } from '@/features/shop/checkout/utils/shippingLineItem'

const SHIPPING_PRODUCT_ID = 'prod_shipping'

const resolveShippingProductId = vi.fn(async () => SHIPPING_PRODUCT_ID)

vi.mock('@/utils/server/stripe/shippingProduct.server', () => ({
    resolveShippingProductId: () => resolveShippingProductId(),
}))

vi.mock('@/utils/server/stripe/resolveBilling.server', () => ({
    resolveBilling: async () => ({
        name: 'Ada Lovelace',
        address: '42 Analytical Engine Way\nMelbourne VIC 3000\nAustralia',
        billing: 'Visa\nEnding in ••••4242',
    }),
}))

const { buildEmailOrderData } = await import('../buildEmailOrderData.server')

/**
 * `expandProduct: false` reproduces a session loaded without
 * `line_items.data.price.product`, where Stripe returns the product as an id.
 */
function session({
    expandProduct = true,
}: { expandProduct?: boolean } = {}): Stripe.Checkout.Session {
    const expandedShipping = {
        id: SHIPPING_PRODUCT_ID,
        metadata: {
            [SHIPPING_PRODUCT_MARKER.key]: SHIPPING_PRODUCT_MARKER.value,
        },
    } as unknown as Stripe.Product

    const expandedKit = {
        id: 'prod_kit',
        metadata: {},
    } as unknown as Stripe.Product

    const shippingProduct = expandProduct
        ? expandedShipping
        : SHIPPING_PRODUCT_ID
    const kitProduct = expandProduct ? expandedKit : 'prod_kit'

    return {
        currency: 'aud',
        amount_total: 5190,
        customer_details: { email: 'ada@example.com' },
        line_items: {
            data: [
                {
                    description: 'Ro/Box',
                    quantity: 1,
                    amount_subtotal: 3500,
                    price: { product: kitProduct },
                },
                {
                    description: 'Shipping',
                    quantity: 1,
                    amount_subtotal: 1690,
                    price: { product: shippingProduct },
                },
            ],
        },
        payment_intent: {
            id: 'pi_123',
            metadata: { shippingService: 'Express shipping' },
        },
        livemode: true,
    } as unknown as Stripe.Checkout.Session
}

beforeEach(() => {
    resolveShippingProductId.mockClear()
})

describe('buildEmailOrderData', () => {
    it('bills postage as the shipping row, not as an item', async () => {
        const data = await buildEmailOrderData(session())

        expect(data.items).toEqual([
            { name: 'Ro/Box', quantity: 1, subtotal: 'AU$35.00' },
        ])
        expect(data.shipping).toBe('AU$16.90')
        expect(data.shippingMethod).toBe('Express shipping')
        expect(data.total).toBe('AU$51.90')
    })

    it('does the same when the product was not expanded', async () => {
        const data = await buildEmailOrderData(
            session({ expandProduct: false }),
        )

        expect(data.items).toEqual([
            { name: 'Ro/Box', quantity: 1, subtotal: 'AU$35.00' },
        ])
        expect(data.shipping).toBe('AU$16.90')
        expect(resolveShippingProductId).toHaveBeenCalled()
    })

    it('does not go looking for the product id when it does not need it', async () => {
        await buildEmailOrderData(session())
        expect(resolveShippingProductId).not.toHaveBeenCalled()
    })

    it('marks a sandbox payment', async () => {
        const live = await buildEmailOrderData(session())
        expect(live.testMode).toBe(false)

        const sandbox = { ...session(), livemode: false }
        expect((await buildEmailOrderData(sandbox)).testMode).toBe(true)
    })
})
