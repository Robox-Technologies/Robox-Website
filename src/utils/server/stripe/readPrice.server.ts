import type { Stripe } from 'stripe'

export type PriceDetails = {
    priceId: string
    currency: string
    price: number
    prices: Record<string, number>
}

/**
 * Pulls the fields a Product needs off an expanded `default_price`.
 *
 * Shared by both product loaders so the base amount and the per-currency map
 * can't drift apart between the list and the single-product read.
 */
export function readPriceDetails(
    price: Stripe.Price,
    productName: string,
): PriceDetails {
    if (price.unit_amount === null) {
        throw new Error(
            `Price for product ${productName} is missing unit_amount`,
        )
    }

    const currency = price.currency.toLowerCase()

    // `currency_options` only comes back when it's expanded, and it always
    // carries the base currency alongside any manual ones - so when it's
    // present it is the whole map, and when it isn't we still have the base.
    const prices: Record<string, number> = { [currency]: price.unit_amount }

    for (const [code, option] of Object.entries(price.currency_options ?? {})) {
        if (option.unit_amount === null) continue
        prices[code.toLowerCase()] = option.unit_amount
    }

    return {
        priceId: price.id,
        currency,
        price: price.unit_amount,
        prices,
    }
}
