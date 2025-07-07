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
export function getCart(): Cart {
    let cart = localStorage.getItem("cart")
    if (!cart) {
        cart = JSON.stringify({quantity: 0, products: {}})
        localStorage.setItem("cart", cart)
    }
    return JSON.parse(cart)
}
export function getItem(product: string): { quantity: number; data: Product } | undefined {
    let cart = getCart()
    return cart["products"][product]
}
export function refreshCart() {
    let cart = getCart()
    let quantity = 0
    let products = cart["products"]
    for (const product in products) {
        if (product == "" || !product) delete cart[product]
        else quantity += products[product]["quantity"]
    }
    cart["quantity"] = quantity
    
    const cartElement = document.getElementById("cart")
    const cartElementText = cartElement?.querySelector("p");
    if (!cartElement || !cartElementText) return;

    if (cart["quantity"] > 99) {
        cartElementText.innerHTML = "99+"
        cartElement.style.display = ""
    }
    else if (cart["quantity"] > 0) {
        cartElementText.innerHTML = `${cart["quantity"]}`
        cartElement.style.display = ""
    }
    else {
        cartElement.style.display = "none"
    }
}
//expects an object of quantity and id
export function removeCartItem(product: string) {
    let cart = getCart()
    cart["quantity"] -= cart["products"][product]["quantity"]
    delete cart["products"][product]
    localStorage.setItem("cart", JSON.stringify(cart))
    refreshCart()
}
export function wipeCart() {
    localStorage.setItem("cart", JSON.stringify({quantity: 0, products: {}}))
    refreshCart()
}
export function addCartItem(product: string, quantity: number, cache: Product) {
    let cart = getCart();
    let item = cart["products"][product]
    if (item) item["quantity"] += quantity
    else {
        cart["products"][product] = {"quantity": quantity, "data": cache}
    }
    cart["products"][product]["data"] = cache
    cart["quantity"] += quantity
    localStorage.setItem("cart", JSON.stringify(cart))
    refreshCart()
}
export function setCartItem(product: string, quantity: number, cache: Product) {
    let cart = getCart()
    let item = cart["products"][product]
    if (!item) {
        item = {"quantity": quantity, "data": cache}
    }
    else {
        cart["quantity"] -= item["quantity"]
        item["quantity"] = quantity
        item["data"] = cache
    }
    
    cart["quantity"] += quantity
    localStorage.setItem("cart", JSON.stringify(cart))
    refreshCart()
}
