/**
 * What we add to a raw Australia Post quote before charging it.
 *
 * Postage is not the whole cost of getting a parcel out the door - the box,
 * padding and label are real money that used to be absorbed silently. Kept as
 * one constant so there is a single number to change, and applied in one place
 * so the quote shown on the address step, the rate written onto the Checkout
 * Session and the figure on the receipt cannot drift apart.
 *
 * TODO(yuma): set this to the real per-parcel packaging cost. At 0 the
 * behaviour is exactly what it was before, so shipping the mechanism ahead of
 * the figure is safe.
 */
export const PACKAGING_CENTS = 0

/**
 * Round up to the nearest 10c. A quote of $12.37 becoming $12.40 costs the
 * customer three cents and keeps us from being a cent short on any parcel,
 * which is the direction the error should fall.
 */
const ROUNDING_CENTS = 10

export function applyShippingSurcharge(auspostCents: number): number {
    const withPackaging = auspostCents + PACKAGING_CENTS
    return Math.ceil(withPackaging / ROUNDING_CENTS) * ROUNDING_CENTS
}
