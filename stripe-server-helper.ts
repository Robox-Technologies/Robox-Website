import stripe, { Stripe } from 'stripe'

import 'dotenv/config'
import { Product, ProductStatus } from 'types/api';

const defaultWeight = 500;
export const stripeAPI = new stripe(process.env.STRIPE_SECRET_KEY)
export const displayStatusMap: { [K in ProductStatus]: string } = {
    "available": "Available for Purchase",
    "not-available": "Out of Stock",
    "preorder": "Pre-order Now",
};


export async function getAllStripe(type: "price"): Promise<Record<string, Stripe.Price>>;
export async function getAllStripe(type: "product"): Promise<Record<string, Stripe.Product>>;
export async function getAllStripe(type: "price" | "product"): Promise<Record<string, Stripe.Product | Stripe.Price>> {
    if (type === "price") {
        return await recursiveItemGrab(stripeAPI.prices)
    }
    else {
        return await recursiveItemGrab(stripeAPI.products)
    }
}

async function recursiveItemGrab(API: Stripe.ProductsResource): Promise<Record<string, Stripe.Product>>;
async function recursiveItemGrab(API: Stripe.PricesResource ): Promise<Record<string, Stripe.Price>>;
async function recursiveItemGrab(API: Stripe.PricesResource | Stripe.ProductsResource ): Promise<Record<string, Stripe.Price | Stripe.Product>> {
    
    let item: Stripe.ApiList<Stripe.Price> | Stripe.ApiList<Stripe.Product> = await API.list();
    const itemArray = [...item.data];
    let has_more = item.has_more;

    // Continue fetching items until there are no more pages
    while (has_more) {
        let moreItems: Stripe.ApiList<Stripe.Price> | Stripe.ApiList<Stripe.Product>;
        // Typescript is very dumb and does not recognise they both have starting_after,
        // trust me remove this if statement and it will not work
        if (isPricesResource(API)) {
            moreItems = await API.list({
                starting_after: item.data[item.data.length - 1].id,
            });
        }
        else {
            moreItems = await API.list({
                starting_after: item.data[item.data.length - 1].id,
            });
        }
           
        has_more = moreItems.has_more;
        itemArray.push(...moreItems.data);
        item = moreItems;
    }

    // Convert the array to an object with item IDs as keys
    let itemObject: Record<string, Stripe.Price | Stripe.Product> = {};
    itemObject = itemArray.filter((item) => item.active).reduce((acc, item) => {
            const id: string = "product" in item && typeof item.product === "string" ? item.product : item.id;
            acc[id] = item;
            return acc;
        }, {} as Record<string, Stripe.Price | Stripe.Product>);
    
    return itemObject;
}


export function isValidStatus(status: ProductStatus | string): status is ProductStatus {
    if (typeof status !== "string") return false;
    // Check if the status is one of the valid statuses
    return ["available", "not-available", "preorder"].includes(status);
}
function isPricesResource(api: Stripe.PricesResource | Stripe.ProductsResource): api is Stripe.PricesResource {
    return !('del' in api ||
        'createFeature' in api ||
        'deleteFeature' in api ||
        'listFeatures' in api ||
        'retrieveFeature' in api); // crude but works
}

export async function getProduct(id: string): Promise<Product | false> {
    try {
        if (id === "quantity") return false
        const product = await stripeAPI.products.retrieve(id);
        if (!product.default_price || typeof product.default_price !== "string") {
            console.error("Product does not have a price")
            return false;
        }
        const status = isValidStatus(product.metadata.status) ? product.metadata.status : undefined;
        if (!status) {
            console.error("Product does not have a proper status")
            return false;
        }
        const price = await stripeAPI.prices.retrieve(product.default_price)
        if (!price || !price.unit_amount) {
            console.error("Product does not have a valid price")
            return false;
        }
        return {
            name: product.name,
            description: product.description ?? "",
            images: product.images,
            price_id: price.id,
            price: price.unit_amount,
            item_id: product.id,
            status: status,
            weight: Number(product.metadata.weight ?? defaultWeight)
        }
    } catch {
        return false
    }
}

export async function getProductList(): Promise<Record<string, Product>> {
    const products = await getAllStripe("product");
    const prices = await getAllStripe("price");
    const combined: Record<string, Product> = {};
    
    for (const productId in products) {
        const product = products[productId];
        const price = prices[productId];
        const status = product.metadata.status ?? undefined;
        if (!isValidStatus(status)) {
            console.error(`Product ${product.id} does not have a valid status`);
            continue;
        }

        const displayStatus = displayStatusMap[status] ?? "Unknown Status";
        combined[productId] = {
            name: product.name,
            internalName: product.name.replaceAll(" ", "-").replaceAll("/", "").toLowerCase(), // Use this for filenames
            description: product.description ?? "",
            images: product.images,
            price_id: price.id,
            price: price.unit_amount ? price.unit_amount : 0, // Convert cents to dollars
            item_id: product.id,
            status: status,
            displayStatus: displayStatus,
            weight: Number(product.metadata.weight ?? defaultWeight)
        };
    }

    return combined;
}
