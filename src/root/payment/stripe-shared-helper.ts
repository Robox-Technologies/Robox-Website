import { Product } from "~types/api";
import { Fees } from "~types/fees";
import fees from "../../fees.json" with { type: "json" };

const feesObject: Fees = typeof fees == "string" ? JSON.parse(fees) : fees;
const feesShipping = feesObject.shipping;

export function calculateTotalCost(cart: Record<string, number>, products: Record<string, Product>, shippingInfo: { country: string; postcode: string } | null = null): { displayProducts: string; displayShipping: string; displayTotal: string; shipping: number; total: number } {
    let totalCost = 0;
    let totalWeight = 0;
    for (const [productId, quantity] of Object.entries(cart)) {
        const product = products[productId];
        if (!product) continue;

        totalCost += product.price * quantity;
        totalWeight += product.weight * quantity;
    }

    let shippingCost = 0;
    let packagingCost = 0;
    
    if (shippingInfo) {
        
    }

    const finalCost = totalCost + shippingCost; 
    return {
        displayProducts: formatPrice(totalCost, true),
        displayShipping: formatPrice(shippingCost, true),
        displayTotal: formatPrice(totalCost + shippingCost, true),
        shipping: shippingCost,
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
