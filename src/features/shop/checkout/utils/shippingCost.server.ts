/**
 * The one place an Australia Post quote becomes what the customer is charged, so the
 * address step, the session rate and the receipt can't drift apart.
 */

/** Round up to the nearest 10c, so the rounding error never falls short. */
const ROUNDING_CENTS = 10

export function applyShippingSurcharge(
    auspostCents: number,
    packagingCents: number,
): number {
    const withPackaging = auspostCents + packagingCents
    return Math.ceil(withPackaging / ROUNDING_CENTS) * ROUNDING_CENTS
}
