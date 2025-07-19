import stripe, { Stripe } from 'stripe'

import 'dotenv/config'
import { Product, ProductStatus } from 'types/api';
import { formatPrice } from './src/root/payment/stripe-shared-helper.js';
import { storeProcessor } from './roboxProcessor.js';

const defaultWeight = 500;
export const stripeAPI = new stripe(process.env.STRIPE_SECRET_KEY)
export const displayStatusMap: { [K in ProductStatus]: string } = {
    "available": "Available for Purchase",
    "not-available": "Out of Stock",
    "preorder": "Pre-order Now"
};

type PaymentType = {
    // Type/Brand/Bank
    name: string | null | undefined,

    // Email/User
    userID?: string | null | undefined,
    
    // ••••XXXX
    last4?: string | null | undefined,

    // MM/YY
    exp_month?: number | undefined,
    exp_year?: number | undefined,
}

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

function makeProductObject(product: stripe.Product, price: stripe.Price, banner?: string): Product | undefined {
    const unitPrice = price.unit_amount ?? 0;

    const status = product.metadata.status ?? undefined;
    if (!isValidStatus(status)) {
        console.error(`Product ${product.id} does not have a valid status`);
        return undefined;
    }
    const displayStatus = displayStatusMap[status] ?? "Unknown Status";

    return {
        name: product.name,
        internalName: product.name.replaceAll(" ", "-").replaceAll("/", "").toLowerCase(), // Use this for filenames
        description: product.description ?? "",
        banner: banner,
        images: product.images,
        price_id: price.id,
        price: unitPrice,
        displayPrice: formatPrice(unitPrice), // Convert cents to dollars
        item_id: product.id,
        status: status,
        displayStatus: displayStatus,
        weight: Number(product.metadata.weight ?? defaultWeight)
    };
}

export async function getProduct(id: string): Promise<Product | false> {
    try {
        if (id === "quantity") return false
        const product = await stripeAPI.products.retrieve(id);
        if (!product.default_price || typeof product.default_price !== "string") {
            console.error("Product does not have a price")
            return false;
        }

        const price = await stripeAPI.prices.retrieve(product.default_price)
        if (!price || !price.unit_amount) {
            console.error("Product does not have a valid price")
            return false;
        }
        
        return makeProductObject(product, price) ?? false;
    } catch {
        return false
    }
}
export async function getCustomer(id: string): Promise<Stripe.Customer | false> {
    try {
        const customer = await stripeAPI.customers.retrieve(id);
        if (!customer || !customer.id) {
            console.error("Customer not found or invalid");
            return false;
        }
        return customer as Stripe.Customer;
    } catch (err) {
        console.error("Error retrieving customer:", err);
        return false;
    }
    
}
export async function getProductList(): Promise<Record<string, Product>> {
    const products = await getAllStripe("product");
    const prices = await getAllStripe("price");
    const combined: Record<string, Product> = {};
    
    for (const productId in products) {
        const stripeProduct = products[productId];
        let banner = stripeProduct.metadata.banner;

        if (banner) {
            banner = storeProcessor.processSync(banner).toString();
        }

        const product = makeProductObject(stripeProduct, prices[productId], banner);
        
        if (product) {
            combined[productId] = product;
        }
    }

    return combined;
}

export function readPaymentMethod(paymentMethod: Stripe.PaymentMethod): PaymentType {
    let paymentType: PaymentType;

    switch (paymentMethod.type) {
        case "acss_debit":
            paymentType = {
                name: paymentMethod.acss_debit?.bank_name,
                last4: paymentMethod.acss_debit?.last4
            }
            break;
        case "us_bank_account":
            paymentType = {
                name: paymentMethod.us_bank_account?.bank_name,
                last4: paymentMethod.us_bank_account?.last4
            }
            break;
        case "kr_card":
            paymentType = {
                name: paymentMethod.kr_card?.brand,
                last4: paymentMethod.kr_card?.last4
            }
            break;
        case "nz_bank_account":
            paymentType = {
                name: paymentMethod.nz_bank_account?.bank_name,
                userID: paymentMethod.nz_bank_account?.account_holder_name,
                last4: paymentMethod.nz_bank_account?.last4
            }
            break;

        case "au_becs_debit":
            paymentType = {
                name: "BECS Direct Debit",
                last4: paymentMethod.au_becs_debit?.last4
            }
            break;
        case "bacs_debit":
            paymentType = {
                name: "Bacs Direct Debit",
                last4: paymentMethod.bacs_debit?.last4
            }
            break;
        case "sepa_debit":
            paymentType = {
                name: "SEPA Direct Debit",
                last4: paymentMethod.sepa_debit?.last4
            }
            break;

        case "card":
            paymentType = {
                name: paymentMethod.card?.brand,
                last4: paymentMethod.card?.last4,
                exp_month: paymentMethod.card?.exp_month,
                exp_year: paymentMethod.card?.exp_year,
            }
            break;
        case "card_present":
            paymentType = {
                name: paymentMethod.card_present?.brand,
                last4: paymentMethod.card_present?.last4,
                exp_month: paymentMethod.card_present?.exp_month,
                exp_year: paymentMethod.card_present?.exp_year,
            }
            break;
        case "interac_present":
            paymentType = {
                name: paymentMethod.interac_present?.brand,
                last4: paymentMethod.interac_present?.last4,
                exp_month: paymentMethod.interac_present?.exp_month,
                exp_year: paymentMethod.interac_present?.exp_year,
            }
            break;

        case "boleto":
            paymentType = {
                name: "Boleto",
                userID: paymentMethod.boleto?.tax_id
            }
            break;
        case "cashapp":
            paymentType = {
                name: "Cash App",
                userID: paymentMethod.cashapp?.cashtag
            }
            break;
        case "link":
            paymentType = {
                name: "Link",
                userID: paymentMethod.link?.email
            }
            break;
        case "paypal":
            paymentType = {
                name: "PayPal",
                userID: paymentMethod.paypal?.payer_email
            }
            break;

        case "eps":
            paymentType = {
                name: paymentMethod.eps?.bank
            }
            break;
        case "fpx":
            paymentType = {
                name: paymentMethod.fpx?.bank
            }
            break;
        case "ideal":
            paymentType = {
                name: paymentMethod.ideal?.bank
            }
            break;
        case "p24":
            paymentType = {
                name: paymentMethod.p24?.bank
            }
            break;
        
        default:
            // Just show paymentMethod.type
            paymentType = {
                name: paymentMethod.type
            }
            break;
    }

    return paymentType
}
