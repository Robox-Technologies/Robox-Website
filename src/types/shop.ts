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
    unitVolume: number
}
export type ProductStatus = 'available' | 'not-available' | 'preorder'
