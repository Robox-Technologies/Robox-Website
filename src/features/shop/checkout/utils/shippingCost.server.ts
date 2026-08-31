/**
 * What we add to a raw Australia Post quote before charging it.
 *
 * Postage is not the whole cost of getting a parcel out the door - the box,
 * padding and label are real money that used to be absorbed silently. Kept as
 * one constant so there is a single number to change, and applied in one place
 * so the quote shown on the address step, the rate written onto the Checkout
 * Session and the figure on the receipt cannot drift apart.
 *
 * $3.39 for the box and $0.38 for glassine bags, in AUD. Other presentment
 * currencies are converted from this along with the postage itself.
 */
export const PACKAGING_CENTS = 339 + 38

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
