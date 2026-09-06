import type { Stripe } from 'stripe'

/** How postage is identified as a line item. Imported by client and server, so no server-only deps. */

/**
 * The line item's display name. Load-bearing: it's all the browser summary has to tell
 * postage apart, so `resolveShippingProductId` reconciles the Stripe Product back to it.
 */
export const SHIPPING_LINE_ITEM_NAME = 'Shipping'

/** Marks the Stripe Product postage is billed through, so the catalog can leave it out. */
export const SHIPPING_PRODUCT_MARKER = { key: 'robox', value: 'shipping' }

/**
 * Whether a Checkout line is postage, matched on the product's marker metadata.
 * Needs `line_items.data.price.product` expanded, or `shippingProductId` passed.
 */
export function isShippingLine(
    line: Stripe.LineItem,
    shippingProductId: string | null,
): boolean {
    const product = line.price?.product
    if (!product) return false

    if (typeof product === 'string') {
        return shippingProductId !== null && product === shippingProductId
    }
    if (product.deleted) return false

    return (
        product.metadata?.[SHIPPING_PRODUCT_MARKER.key] ===
        SHIPPING_PRODUCT_MARKER.value
    )
}

/**
 * The browser's fallback for `isShippingLine`, matching on name because the client
 * session carries no product. Server code should use `isShippingLine`.
 */
export function isShippingLineName(name: string | null | undefined): boolean {
    return name === SHIPPING_LINE_ITEM_NAME
}
