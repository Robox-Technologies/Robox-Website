/**
 * The last step between an Australia Post quote and what the customer is
 * charged for postage.
 *
 * Packaging is no longer a constant: it is the sum of the satchels and cartons
 * the order actually needs, worked out in `packaging.server.ts`. This applies it
 * in one place so the figure shown on the address step, the rate written onto
 * the Checkout Session and the figure on the receipt cannot drift apart.
 */

/**
 * Round up to the nearest 10c. A quote of $12.37 becoming $12.40 costs the
 * customer three cents and keeps us from being a cent short on any parcel,
 * which is the direction the error should fall.
 */
const ROUNDING_CENTS = 10

export function applyShippingSurcharge(
    auspostCents: number,
    packagingCents: number,
): number {
    const withPackaging = auspostCents + packagingCents
    return Math.ceil(withPackaging / ROUNDING_CENTS) * ROUNDING_CENTS
}
