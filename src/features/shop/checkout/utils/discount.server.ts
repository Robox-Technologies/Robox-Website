import type { Stripe } from 'stripe'
import { stripeAPI } from '@/utils/server/stripe/index.server'

/** Mirrors the original's DiscountStatus, minus the numeric enum. */
export type DiscountStatus = 'unset' | 'success' | 'stale' | 'error'

export type DiscountInfo = {
    amountOffCents: number
    percentOff: number
    /** Product ids the coupon is restricted to, or null when it applies to all. */
    whitelistProducts: string[] | null
}

/** Stripe won't take a charge under 50c, so a discount can never go below it. */
const MIN_CHARGE_CENTS = 50

/**
 * The coupon hangs off `promotion` in current API versions (the original, on an
 * older SDK, read `promotionCodes.coupon` directly), and both it and its
 * product restrictions have to be expanded to come back as objects.
 */
const COUPON_EXPAND = [
    'data.promotion.coupon',
    'data.promotion.coupon.applies_to',
]

/**
 * Resolve a customer-entered code. The original accepts either a user-facing
 * promotion code or a raw coupon id, trying them in that order.
 */
export async function resolveDiscount(
    code: string,
): Promise<DiscountInfo | null> {
    const trimmed = code.trim()
    if (!trimmed) return null

    let coupon: Stripe.Coupon | null = null

    const promoCodes = await stripeAPI.promotionCodes
        .list({ limit: 1, code: trimmed, expand: COUPON_EXPAND })
        .catch(() => null)

    const promo = promoCodes?.data[0]
    const promoCoupon = promo?.promotion?.coupon

    if (promo && promoCoupon && typeof promoCoupon !== 'string') {
        // list() happily returns inactive codes; the original didn't check, but
        // honouring an expired code would be a real discount on a real charge.
        if (!promo.active || !promoCoupon.valid) return null
        coupon = promoCoupon
    } else {
        coupon = await stripeAPI.coupons
            .retrieve(trimmed, { expand: ['applies_to'] })
            .catch(() => null)
        if (coupon && !coupon.valid) return null
    }

    if (!coupon) return null

    return {
        amountOffCents: coupon.amount_off ?? 0,
        percentOff: coupon.percent_off ?? 0,
        whitelistProducts: coupon.applies_to?.products ?? null,
    }
}

/**
 * Discount in cents for a resolved coupon, following the original's rules:
 * percent-off applies per line item (restricted to the coupon's product
 * whitelist when it has one), amount-off is added on top, and the result is
 * clamped so the payable total never drops below Stripe's minimum.
 */
export function calculateDiscountCents({
    discount,
    lines,
    preDiscountTotalCents,
}: {
    discount: DiscountInfo
    lines: Array<{ itemId: string; lineTotalCents: number }>
    preDiscountTotalCents: number
}): number {
    let discountCents = 0

    for (const line of lines) {
        const applies =
            !discount.whitelistProducts ||
            discount.whitelistProducts.includes(line.itemId)

        if (applies) {
            discountCents += line.lineTotalCents * (discount.percentOff / 100)
        }
    }

    discountCents += discount.amountOffCents

    return Math.floor(
        Math.min(
            discountCents,
            Math.max(preDiscountTotalCents - MIN_CHARGE_CENTS, 0),
        ),
    )
}
