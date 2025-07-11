//TODO: Remake this system (cache the product cost and get rid of weird funky quantity key)

import { Product } from "types/api"

interface Cart {
    quantity: number;
    products: Record<string, { quantity: number; data: Product }>;
}

export const stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY;

export async function getProducts(): Promise<Record<string, Product>> {
    return await (await fetch("/api/store/products")).json()
}
export function getCart(serverProducts?: Record<string, Product>): Cart {
    let cart: Cart;

    try {
        const rawCart = localStorage.getItem("cart");
        cart = JSON.parse(rawCart);
    } catch (error) {
        console.warn("Couldn't fetch cart from localStorage: ", error);
    }

    if (!cart) {
        cart = { quantity: 0, products: {} };
        saveCart(cart);
    }

    if (serverProducts) {
        // Verify against cart
        for (const productId in cart.products) {
            const serverProduct = serverProducts[productId];

            if (!serverProduct) {
                // Unknown product - remove!
                cart = removeCartItem(productId);
                continue;
            }

            // Update cart data
            cart.products[productId] = {
                quantity: cart.products[productId].quantity,
                data: serverProduct
            }

            saveCart(cart);
        }
    }

    return cart;
}

function saveCart(cart: Cart) {
    localStorage.setItem("cart", JSON.stringify(cart));
}

export function getItem(product: string): { quantity: number; data: Product } | undefined {
    const cart = getCart()
    return cart.products[product]
}
export function refreshCart() {
    const cart = getCart()
    let quantity = 0
    const products = cart.products
    for (const product in products) {
        if (product == "" || !product) delete cart.products[product]
        else quantity += products[product].quantity
    }
    cart.quantity = quantity
    saveCart(cart);
    
    const cartElement = document.getElementById("cart")
    const cartElementText = cartElement?.querySelector("p");
    if (!cartElement || !cartElementText) return;

    if (cart.quantity > 99) {
        cartElementText.innerHTML = "99+"
        cartElement.style.display = ""
    }
    else if (cart.quantity > 0) {
        cartElementText.innerHTML = `${cart.quantity}`
        cartElement.style.display = ""
    }
    else {
        cartElement.style.display = "none"
    }
}
//expects an object of quantity and id
export function removeCartItem(product: string): Cart {
    const cart = getCart()
    cart.quantity -= cart.products[product].quantity
    delete cart.products[product]
    saveCart(cart);
    refreshCart();
    return cart;
}
export function wipeCart() {
    saveCart({ quantity: 0, products: {} });
    refreshCart();
}
export function addCartItem(product: string, quantity: number, cache: Product) {
    const cart = getCart();
    const item = cart.products[product]

    if (item) {
        item.quantity += quantity
    } else {
        cart.products[product] = { "quantity": quantity, "data": cache }
    }
    
    cart.products[product].data = cache;
    cart.quantity += quantity;
    saveCart(cart);
    refreshCart();
}
export function setCartItem(product: string, quantity: number, cache: Product) {
    const cart = getCart()
    let item = cart.products[product]
    if (!item) {
        item = {"quantity": quantity, "data": cache}
    } else {
        cart.quantity -= item.quantity
        item.quantity = quantity
        item.data = cache
    }
    
    cart.products[product] = item;
    cart.quantity += quantity;
    saveCart(cart);
    refreshCart();
}
