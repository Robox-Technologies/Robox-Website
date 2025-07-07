import { Product } from "types/api";
import fees from "../fees.json" with { type: "json" };

const feesObject = typeof fees == "string" ? JSON.parse(fees) : fees;
export const shippingCost = feesObject.shippingCost ?? 8.00;

export function calculateTotalCost(cart: Record<string, number>, products: Record<string, Product>): { products: number; total: number } {
    let totalCost = 0;
    for (const [productId, quantity] of Object.entries(cart)) {
        const product = products[productId];
        if (product) {
            totalCost += product.price * quantity;
        }
    }

    return {
        products: totalCost,
        total: totalCost + (totalCost > 0 ? shippingCost : 0)
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
