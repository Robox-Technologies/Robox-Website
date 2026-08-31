import type { Stripe } from 'stripe'

/**
 * How postage is identified once it's a line item rather than a shipping rate.
 *
 * Shared by the client summary and the server, and imported by both - so it
 * carries no server-only dependencies.
 */

/** Product name, and therefore the line item's display name. */
export const SHIPPING_LINE_ITEM_NAME = 'Shipping'

/**
 * Marks the Stripe Product that postage is billed through, so the catalog can
 * leave it out of the shop and the receipt can tell it apart from a real
 * product.
 */
export const SHIPPING_PRODUCT_MARKER = { key: 'robox', value: 'shipping' }

/**
 * Whether a Checkout line is the postage line rather than something ordered.
 *
 * Matched on the product's marker metadata rather than on the display name, so
 * renaming the product cannot quietly turn postage back into an item.
 *
 * That reading needs `line_items.data.price.product` expanded. When it isn't,
 * `product` is a bare id and the id is all there is to go on - hence
 * `shippingProductId`, which callers that can resolve it should pass. Without
 * either, postage is indistinguishable from a product and this says so by
 * returning false rather than guessing.
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
