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
