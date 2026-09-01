export type Product = {
    name: string
    internalName: string
    description: string
    banner: string
    /**
     * Unit amount in the base (settlement) currency's minor units. This is the
     * figure the catalog renders and the one every other currency is derived
     * from.
     */
    price: number
    /** Lowercase ISO 4217 code of the base price. */
    currency: string
    /**
     * The Stripe Price id, so a Checkout Session can reference the product with
     * `line_items[].price` rather than restating an amount the server would
     * then have to be trusted on.
     */
    priceId: string
    /**
     * Unit amount in minor units keyed by lowercase ISO 4217 code, read from
     * the Price's `currency_options`. Always contains `currency`.
     *
     * A currency listed here is a *manual* price: Stripe charges exactly this
     * amount and Adaptive Pricing does not convert it. That exactness is the
     * point - it's what lets the storefront show a number the checkout will
     * match. Currencies absent from this map fall back to the base currency on
     * the storefront and are converted by Adaptive Pricing at checkout.
     */
    prices: Record<string, number>
    item_id: string
    status: ProductStatus
    weight: number
    /** How this product is packed, and what that implies for the parcel. */
    packaging: ProductPackaging
    /**
     * For a bundle, the products it is actually made of, keyed by Stripe product
     * id. Used for packing only - the bundle's own `weight` already accounts for
     * its contents, so expanding this for weight would double-count.
     */
    combo: Record<string, number> | null
}

export type ProductStatus = 'available' | 'not-available' | 'preorder'

/** Parcel dimensions in centimetres. */
export type Packaging = {
    length: number
    width: number
    height: number
}

export type PackagingType = 'box' | 'bag'

/**
 * How many of this product fit in each shop-standard satchel. `null` means it
 * does not fit that size at all.
 */
export type BagCapacity = {
    small: number | null
    medium: number | null
    large: number | null
}

/**
 * Boxed products carry their own carton and their own packaging cost, because
 * both vary per product. Bagged products carry only how many of them fit per
 * satchel size - the satchels themselves are shop-wide, so their dimensions and
 * cost live in `packaging.server.ts` rather than being restated per product.
 */
export type ProductPackaging =
    | { type: 'box'; dimensions: Packaging; packagingCents: number }
    | { type: 'bag'; capacity: BagCapacity }
