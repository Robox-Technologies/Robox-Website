import { truncate } from "fs/promises";
import { Product } from "../../../types/api.js";

const backendExecution = typeof window === 'undefined';
const domesticCountryCode = "AU";

let calculatePostage;
if (backendExecution) {
    calculatePostage = (await import( /* webpackIgnore: true */'../../../auspost-server-helper.js')).calculatePostage;
}

export async function calculateTotalCost(
    cart: Record<string, number>,
    products: Record<string, Product>, 
    shippingInfo: { country: string; postcode: string } | null = null,
    discountInfo: { amountOff: number, percentOff: number, whitelistProducts: string[] | null } | null = null): 
    Promise<{ displayProducts: string; displayShipping: string; displayDiscount: string; displayTotal: string; shipping: number; discount: number; total: number; shippingSucceeded: boolean; discountStatus: number; }> {
    let totalCost = 0;
    let totalWeight = 0;
    let totalUnitVolume = 0;
    let discountCost = 0;
    for (const [productId, quantity] of Object.entries(cart)) {
        const product = products[productId];
        if (!product) continue;

        let productCostSubtotal = product.price * quantity;
        if (discountInfo && (!discountInfo.whitelistProducts || discountInfo.whitelistProducts.includes(productId))) {
            discountCost += productCostSubtotal * (discountInfo.percentOff / 100);
        }

        totalCost += productCostSubtotal;
        totalWeight += product.weight * quantity;
        totalUnitVolume += product.unitVolume * quantity;
    }
    
    let shippingCost = 0;
    let shippingSucceeded = false;
    if (shippingInfo && (domesticCountryCode != shippingInfo.country || shippingInfo.postcode)) {
        try {
            if (backendExecution && calculatePostage) {
                // Running on server
                shippingCost = await calculatePostage(shippingInfo.country, shippingInfo.postcode, totalUnitVolume, totalWeight);
            } else {
                // Running from web - as this is not required as of yet, this will be populated in the future
                throw new Error("Client-side postage calculations are not yet available.");
            }

            shippingSucceeded = true;
        } catch (error) {
            console.log("Problem occured when fetching shipping information: ", error);
        }
    }

    let finalCost = totalCost + shippingCost;

    let discountStatus = -1;
    if (discountInfo) {
        // Note: we can not have a final cost less than 50c else it causes an error with Stripe payments
        discountCost += discountInfo.amountOff;
        discountCost = Math.floor(Math.min(discountCost, finalCost - 50));
        finalCost -= discountCost;
        discountStatus = 1;

        // If discount is 0, coupon was valid but no discount was applied.
        if (discountCost == 0) {
            discountStatus = -2;
        }
    }

    return {
        displayProducts: formatPrice(totalCost, true),
        displayShipping: formatPrice(shippingCost, true),
        displayDiscount: formatPrice(discountCost, true),
        displayTotal: formatPrice(finalCost, true),
        shipping: shippingCost,
        discount: discountCost,
        total: finalCost,
        shippingSucceeded: shippingSucceeded,
        discountStatus: discountStatus
    };
}

export function cartToDictionary(): Record<string, number> {
    const cart = localStorage.getItem("cart");
    if (!cart) return {};
    const parsedCart = JSON.parse(cart);
    if (!parsedCart || !parsedCart.products) return {};
    const products = parsedCart.products;
    const dictionary: Record<string, number> = {};
    for (const productId in products) {
        dictionary[productId] = products[productId].quantity;
    }
    return dictionary;
}

export function formatPrice(price: number, forceCents: boolean = false): string {
    return `AU$${(price / 100).toFixed(!forceCents && Number.isInteger(price) ? 0 : 2)}`;
}
