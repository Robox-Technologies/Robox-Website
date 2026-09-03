export type Product = {
    name: string
    internalName: string
    description: string
    banner: string
    /** Unit amount in the base (settlement) currency's minor units. */
    price: number
    /** Lowercase ISO 4217 code of the base price. */
    currency: string
    /** Stripe Price id, so a Checkout Session can use `line_items[].price` instead of an amount. */
    priceId: string
    /**
     * Manual prices from the Price's `currency_options`, keyed by lowercase ISO 4217
     * code; always contains `currency`. Anything absent is converted by Adaptive Pricing.
     */
    prices: Record<string, number>
    item_id: string
    status: ProductStatus
    weight: number
    /** How this product is packed, and what that implies for the parcel. */
    packaging: ProductPackaging
    /** For a bundle, its contents keyed by Stripe product id. Packing only — `weight` already covers them. */
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

/** How many of this product fit each shop-standard satchel; `null` means it doesn't fit. */
export type BagCapacity = {
    small: number | null
    medium: number | null
    large: number | null
}

/** Boxed products carry their own carton and cost; bagged ones only their per-satchel capacity. */
export type ProductPackaging =
    | { type: 'box'; dimensions: Packaging; packagingCents: number }
    | { type: 'bag'; capacity: BagCapacity }
