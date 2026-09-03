import { Stripe } from 'stripe'
import type { Product } from 'src/types/shop'
import slugify from 'slugify'
import { stripeAPI } from './index.server'
import { createCachedLoader } from '@/utils/server/cache.server'
import { renderBanner } from '@/utils/server/renderBanner.server'

import { isValidStatus } from 'src/types/guards/shop'
import { readPriceDetails } from './readPrice.server'
import { SHIPPING_PRODUCT_MARKER } from '@/features/shop/checkout/utils/shippingLineItem'
import { readCombo, readPackaging } from './readPackaging.server'

/** Short enough that a dashboard change shows up on its own, long enough to absorb a burst. */
const PRODUCT_CACHE_TTL_MS = 60_000

async function fetchAllProducts(): Promise<Product[]> {
    const stripeProducts = await stripeAPI.products.list({
        // Unfiltered this returns archived products too, which would stay on the shop.
        active: true,
        // Stripe pages at 10 by default. 100 is the ceiling; past that use `autoPagingToArray`.
        limit: 100,
        // `currency_options` only comes back expanded, and the currency switcher reads it.
        expand: ['data.default_price.currency_options'],
    })
    const products = await Promise.all(
        stripeProducts.data
            // Postage's own Product isn't something the shop sells. Filtered before
            // validation, so it never reports itself as misconfigured.
            .filter(
                (product) =>
                    product.metadata[SHIPPING_PRODUCT_MARKER.key] !==
                    SHIPPING_PRODUCT_MARKER.value,
            )
            .map(async (product) => {
                try {
                    return await readProduct(product)
                } catch (error) {
                    // Skipped rather than fatal, so a half-finished dashboard draft can't
                    // take down the build. The log names what to fix.
                    console.error(
                        `[catalog] skipping product ${product.id} (${product.name}): ${(error as Error).message}`,
                    )
                    return null
                }
            }),
    )
    return products.filter((product): product is Product => product !== null)
}

/** One product, or a throw naming what's wrong with it. The caller decides whether that's fatal. */
async function readProduct(product: Stripe.Product): Promise<Product> {
    // Checked, not cast: a half-finished draft has no default price, and a TypeError
    // wouldn't name the product that needs one.
    const price = product.default_price
    if (!price || typeof price === 'string') {
        throw new Error('has no expanded default price')
    }

    const priceDetails = readPriceDetails(price, product.name)

    const status = product.metadata.status || 'not-available'
    if (!isValidStatus(status)) {
        throw new Error(`invalid status: ${status}`)
    }

    const combo = readCombo(product.metadata, product.name)

    const weight = product.metadata.weight
    if (weight === undefined) {
        throw new Error('missing weight metadata')
    }

    return {
        // URL slug for the product page. Derived from the name rather than set
        // by hand so it cannot drift from what the catalog shows.
        internalName: slugify(product.name, {
            lower: true,
            strict: true,
        }),
        name: product.name,
        description: product.description ?? '',
        item_id: product.id,
        status,
        banner: await renderBanner(product.metadata.banner),
        ...priceDetails,
        weight: Number(weight),
        packaging: readPackaging(product.metadata, product.name, {
            isBundle: combo !== null,
        }),
        combo,
    }
}

/** Cached because every unauthenticated `/_actions/*` call reads it, as does every build page. */
const loadAllProducts = createCachedLoader(fetchAllProducts, {
    ttlMs: PRODUCT_CACHE_TTL_MS,
})

export function getAllProducts(): Promise<Product[]> {
    return loadAllProducts()
}
