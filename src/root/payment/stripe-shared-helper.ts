import { Product } from "../../../types/api.js";

const backendExecution = typeof window === 'undefined';

let calculatePostage;
if (backendExecution) {
    calculatePostage = (await import( /* webpackIgnore: true */'../../../auspost-server-helper.js')).calculatePostage;
}

export async function calculateTotalCost(cart: Record<string, number>, products: Record<string, Product>, shippingInfo: { country: string; postcode: string } | null = null): Promise<{ displayProducts: string; displayShipping: string; displayTotal: string; shipping: number; total: number; shippingSucceeded: boolean }> {
    let totalCost = 0;
    let totalWeight = 0;
    let totalUnitVolume = 0;
    for (const [productId, quantity] of Object.entries(cart)) {
        const product = products[productId];
        if (!product) continue;

        totalCost += product.price * quantity;
        totalWeight += product.weight * quantity;
        totalUnitVolume += product.unitVolume * quantity;
    }
    
    let shippingCost = 0;
    let shippingSucceeded = false;
    if (shippingInfo) {
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

    const finalCost = totalCost + shippingCost; 
    return {
        displayProducts: formatPrice(totalCost, true),
        displayShipping: formatPrice(shippingCost, true),
        displayTotal: formatPrice(totalCost + shippingCost, true),
        shipping: shippingCost,
        total: finalCost,
        shippingSucceeded: shippingSucceeded
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
