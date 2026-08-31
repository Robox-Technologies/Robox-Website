import { Stripe } from 'stripe'
import type { Product } from 'src/types/shop'
import slugify from 'slugify'
import { stripeAPI } from './index.server'
import { isValidStatus } from 'src/types/guards/shop'
import { readPackaging, readPriceDetails } from './readPrice.server'

export async function getProductById(id: string): Promise<Product | null> {
    try {
        const product = await stripeAPI.products.retrieve(id, {
            expand: ['default_price.currency_options'],
        })
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
            internalName: slugify(product.name, { lower: true, strict: true }),
            name: product.name,
            description: product.description ?? '',
            item_id: product.id,
            status: status,
            banner: '',
            ...priceDetails,
            weight: Number(weight),
            unitVolume: Number(product.metadata.unitVolume ?? 0),
            packaging: readPackaging(product.metadata, product.name),
        }
    } catch (error) {
        if (
            error instanceof Stripe.errors.StripeError &&
            error.statusCode === 404
        ) {
            return null
        }
        throw error
    }
}
