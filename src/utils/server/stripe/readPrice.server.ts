import type { Stripe } from 'stripe'
import type { Packaging } from '@/types/shop'

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

/**
 * Parcel dimensions for a product, in centimetres.
 *
 * Falls back to the box the shipping code used to hardcode for everything, so
 * a product without the metadata still quotes as it did before rather than
 * failing the build. Set `packagedLength` / `packagedWidth` /
 * `packagedHeight` on each product in Stripe to get its real box.
 */
export const DEFAULT_PACKAGING: Packaging = {
    length: 24,
    width: 16,
    height: 8,
}

function readDimension(
    value: string | undefined,
    fallback: number,
    productName: string,
    key: string,
): number {
    if (value === undefined) return fallback

    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed <= 0) {
        throw new Error(`Invalid ${key} for product ${productName}: ${value}`)
    }
    return parsed
}

export function readPackaging(
    metadata: Stripe.Metadata,
    productName: string,
): Packaging {
    return {
        length: readDimension(
            metadata.packagedLength,
            DEFAULT_PACKAGING.length,
            productName,
            'packagedLength',
        ),
        width: readDimension(
            metadata.packagedWidth,
            DEFAULT_PACKAGING.width,
            productName,
            'packagedWidth',
        ),
        height: readDimension(
            metadata.packagedHeight,
            DEFAULT_PACKAGING.height,
            productName,
            'packagedHeight',
        ),
    }
}
