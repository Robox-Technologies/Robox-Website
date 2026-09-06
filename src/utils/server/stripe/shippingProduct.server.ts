import { stripeAPI } from './index.server'
import {
    SHIPPING_LINE_ITEM_NAME,
    SHIPPING_PRODUCT_MARKER,
} from '@/features/shop/checkout/utils/shippingLineItem'

/**
 * The Stripe Product postage is billed through, found by its marker metadata and created
 * on first use. Inline `product_data` would mint a new Product on every checkout.
 */
let cachedProductId: string | null = null

export async function resolveShippingProductId(): Promise<string> {
    if (cachedProductId) return cachedProductId

    // `products.search` is eventually consistent; a miss only means creating a second one.
    const existing = await stripeAPI.products.search({
        query: `metadata['${SHIPPING_PRODUCT_MARKER.key}']:'${SHIPPING_PRODUCT_MARKER.value}'`,
        limit: 1,
    })

    const found = existing.data[0]
    if (found) {
        cachedProductId = found.id
        // The browser summary matches postage on the name, so put it back rather than
        // trusting the dashboard. Only written when it actually drifted.
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
