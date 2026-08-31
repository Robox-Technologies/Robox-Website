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

/**
 * Short enough that a price or availability change in the Stripe dashboard shows
 * up on its own, long enough that a burst of checkout traffic is one read rather
 * than one per request. The charged amount is still validated against this list
 * (see `checkoutPricing.server.ts`), so the window is how long a just-changed
 * price keeps applying — not a gap in the price check.
 */
const PRODUCT_CACHE_TTL_MS = 60_000

async function fetchAllProducts(): Promise<Product[]> {
    const stripeProducts = await stripeAPI.products.list({
        // Unfiltered, this returns archived products too, so archiving a
        // product in the dashboard would leave it on the shop. Availability
        // still runs through `metadata.status`; this is the harder off switch.
        active: true,
        // Stripe pages at 10 by default, so without this the catalog would
        // silently stop at the tenth product. 100 is the API's ceiling; past
        // that this needs `autoPagingToArray`.
        limit: 100,
        // `currency_options` is only returned when explicitly expanded, and it
        // is what the storefront's currency switcher reads - without it every
        // product looks single-currency.
        expand: ['data.default_price.currency_options'],
    })
    const products = await Promise.all(
        stripeProducts.data
            // Postage is billed through a Product of our own, which is not
            // something the shop sells. Filtered before validation so it never
            // reports itself as a misconfigured product.
            .filter(
                (product) =>
                    product.metadata[SHIPPING_PRODUCT_MARKER.key] !==
                    SHIPPING_PRODUCT_MARKER.value,
            )
            .map(async (product) => {
                try {
                    return await readProduct(product)
                } catch (error) {
                    // One unusable product used to take down the whole build, which
                    // meant a half-finished draft in the dashboard - or a fixture
                    // left behind by `stripe trigger` - broke the site. Skip it and
                    // say so instead: it disappears from the shop, which is the
                    // safe direction, and the log names what to fix.
                    console.error(
                        `[catalog] skipping product ${product.id} (${product.name}): ${(error as Error).message}`,
                    )
                    return null
                }
            }),
    )
    return products.filter((product): product is Product => product !== null)
}

/**
 * One product, or a throw naming what's wrong with it. Validation stays strict
 * here - the caller decides that an invalid product is skipped rather than
 * fatal, so the reason still has to be specific enough to act on.
 */
async function readProduct(product: Stripe.Product): Promise<Product> {
    // Checked rather than cast: a product with no default price is the shape a
    // half-finished dashboard draft takes, and dereferencing it would report a
    // TypeError instead of naming the product that needs a price.
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

/**
 * Cached because every public checkout action reads it: the actions under
 * `src/actions` are reachable unauthenticated at `/_actions/*`, and an uncached
 * read turned each of those requests into a Stripe API call. Also collapses the
 * repeat reads a build does across `getStaticPaths` and the shop pages.
 */
const loadAllProducts = createCachedLoader(fetchAllProducts, {
    ttlMs: PRODUCT_CACHE_TTL_MS,
})

export function getAllProducts(): Promise<Product[]> {
    return loadAllProducts()
}
