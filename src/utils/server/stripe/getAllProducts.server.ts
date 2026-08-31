import { Stripe } from 'stripe'
import type { Product } from 'src/types/shop'
import slugify from 'slugify'
import { stripeAPI } from './index.server'
import { createCachedLoader } from '@/utils/server/cache.server'
import { renderBanner } from '@/utils/server/renderBanner.server'

import { isValidStatus } from 'src/types/guards/shop'
import { readPriceDetails } from './readPrice.server'

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
    const products: Product[] = await Promise.all(
        stripeProducts.data.map(async (product) => {
            const priceDetails = readPriceDetails(
                product.default_price as Stripe.Price,
                product.name,
            )
            const status = product.metadata.status || 'not-available'
            if (!isValidStatus(status)) {
                throw new Error(
                    `Invalid status for product ${product.name}: ${status}`,
                )
            }
            const weight = product.metadata.weight
            if (weight === undefined) {
                throw new Error(`Missing weight for product ${product.name}`)
            }
            return {
                //URL slug for product page, can be generated from name but allowing it to be set manually for better control
                internalName: slugify(product.name, {
                    lower: true,
                    strict: true,
                }),
                name: product.name,
                description: product.description ?? '',
                // Looking into what this is
                item_id: product.id,
                status: status,
                banner: await renderBanner(product.metadata.banner),
                ...priceDetails,
                weight: Number(weight),
                unitVolume: Number(product.metadata.unitVolume ?? 0),
            }
        }),
    )
    return products
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
