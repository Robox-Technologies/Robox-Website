import { Product } from "types/api";
import { Fees } from "types/fees";
import fees from "../fees.json" with { type: "json" };

const feesObject: Fees = typeof fees == "string" ? JSON.parse(fees) : fees;
const feesShipping = feesObject.shipping;

export function calculateTotalCost(cart: Record<string, number>, products: Record<string, Product>): { displayProducts: string; displayShipping: string; displayTotal: string; total: number } {
    let totalCost = 0;
    let totalWeight = 0;
    for (const [productId, quantity] of Object.entries(cart)) {
        const product = products[productId];
        if (!product) continue;

        totalCost += product.price * quantity;
        totalWeight += product.weight * quantity;
    }

    /*
    Shipping calculations.
    The total weight is used to search for the appropriate flat-rate bracket.
    If the weight exceeds 5kg (5000g), we will default to the highest bracket and round up the excess weight to the nearest kg.
    The excess weight is used for the per-kg excess fee, which is a roughly the average per-kg excess.

    Example: A regular parcel of weight 6.1 kg.
    Basic charge: $23.30.
    Distance charge: $6 per kg (in excess of 5kg) rounded up to the nearest kg = $6 x 2 = $12.
    Total charge: $23.30 + $12 = $35.30

    Sources: 
    https://auspost.com.au/content/dam/auspost_corp/media/documents/mypost-business-postage-rates-guide.pdf
    https://auspost.com.au/content/dam/auspost_corp/media/documents/post-guides/post-charges-guide-ms11.pdf
    */
    
    let shippingCost = totalWeight > 0 ? feesShipping.weightBrackets.find((element) => totalWeight < element.maxWeight)?.price : 0;

    if (shippingCost == null || shippingCost == undefined) {
        // Over 5kg - add per kg penalty.
        shippingCost = feesShipping.maximum;

        // Rounds up to the nearest kg and adds to total
        const weightExcess = Math.ceil(Math.max(totalWeight/1000 - 5, 0));
        shippingCost += weightExcess * feesShipping.penaltyFeePerKg;
    }

    const finalCost = totalCost + shippingCost; 
    return {
        displayProducts: formatPrice(totalCost, true),
        displayShipping: formatPrice(shippingCost, true),
        displayTotal: formatPrice(totalCost + shippingCost, true),
        total: finalCost
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
