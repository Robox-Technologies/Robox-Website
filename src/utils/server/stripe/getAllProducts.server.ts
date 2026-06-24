import { Stripe } from 'stripe'
import type { Product } from 'src/types/shop'
import slugify from 'slugify'
import { stripeAPI } from './index.server'



import { isValidStatus } from 'src/types/guards/shop'

export async function getAllProducts(): Promise<Product[]> {
    const stripeProducts = await stripeAPI.products.list({
        expand: ['data.default_price'],
    })
    const products: Product[] = stripeProducts.data.map((product) => {
        const price = product.default_price as Stripe.Price
        if (price.unit_amount === null) {
            throw new Error(
                `Price for product ${product.name} is missing unit_amount`,
            )
        }
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
            internalName: slugify(product.name, { lower: true, strict: true }),
            name: product.name,
            description: product.description ?? '',
            // Looking into what this is
            item_id: product.id,
            status: status,
            banner: '',
            price: price.unit_amount,
            currency: price.currency,
            weight: Number(weight),
            unitVolume: Number(product.metadata.unitVolume ?? 0),
        }
    })
    return products
}