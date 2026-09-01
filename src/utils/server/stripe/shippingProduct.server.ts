import { stripeAPI } from './index.server'
import {
    SHIPPING_LINE_ITEM_NAME,
    SHIPPING_PRODUCT_MARKER,
} from '@/features/shop/checkout/utils/shippingLineItem'

/**
 * The Stripe Product postage is billed through.
 *
 * Postage is a line item rather than a `shipping_option` because any session
 * carrying shipping options makes the wallets collect a delivery address of
 * their own, which would let Apple Pay or Link ship an order to somewhere the
 * postage was never quoted for.
 *
 * A line item needs a product. Passing `product_data` inline would mint a new
 * Product on every checkout and fill the dashboard with them, so this reuses
 * one - found by its marker metadata rather than by name, and created on first
 * use. That means no manual setup, and it works the same in test and live mode
 * without anyone having to remember to copy it across.
 */
let cachedProductId: string | null = null

export async function resolveShippingProductId(): Promise<string> {
    if (cachedProductId) return cachedProductId

    // `products.search` indexes metadata, and is eventually consistent - fine
    // here, because a miss only means creating a second one, and the next
    // lookup settles on whichever it finds.
    const existing = await stripeAPI.products.search({
        query: `metadata['${SHIPPING_PRODUCT_MARKER.key}']:'${SHIPPING_PRODUCT_MARKER.value}'`,
        limit: 1,
    })

    const found = existing.data[0]
    if (found) {
        cachedProductId = found.id
        // The name is what the browser summary matches postage on - it cannot
        // see the marker metadata - so a rename in the dashboard would quietly
        // fold postage into the subtotal and show shipping as free. Put back
        // rather than trusted, so the invariant survives whatever anyone does
        // to the product. Only written when it actually drifted.
        if (found.name !== SHIPPING_LINE_ITEM_NAME) {
            console.warn(
                `[shipping-product] ${found.id} is named "${found.name}"; renaming it back to "${SHIPPING_LINE_ITEM_NAME}", which the checkout summary matches on`,
            )
            await stripeAPI.products.update(found.id, {
                name: SHIPPING_LINE_ITEM_NAME,
            })
        }
        return found.id
    }

    const created = await stripeAPI.products.create({
        name: SHIPPING_LINE_ITEM_NAME,
        description: 'Postage and packaging',
        metadata: {
            [SHIPPING_PRODUCT_MARKER.key]: SHIPPING_PRODUCT_MARKER.value,
        },
    })

    cachedProductId = created.id
    return created.id
}
