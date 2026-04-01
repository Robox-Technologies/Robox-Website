import type { Product } from 'src/types/shop'
import { atom, map } from 'nanostores'

const cartKey = 'roboxCart'

export const cartItems = map<Record<string, Product & { quantity: number }>>({})

// Load cart from localStorage
function loadCart() {
    if (typeof window === 'undefined') return

    const cart = localStorage.getItem(cartKey)
    if (!cart) return

    try {
        cartItems.set(JSON.parse(cart))
    } catch (e) {
        console.error('Failed to parse cart:', e)
        localStorage.removeItem(cartKey)
    }
    console.log('Cart loaded:', cartItems.get()) // Debug log to check loaded cart items
}

// Save cart whenever it changes
cartItems.subscribe((value) => {
    if (typeof window === 'undefined') return
    localStorage.setItem(cartKey, JSON.stringify(value))
})
export function addToCart(productId: string, quantity = 1) {
    const cart = cartItems.get()
    console.log(`Adding to cart: ${productId} (quantity: ${quantity})`) // Debug log to check product being added
    cartItems.set({
        ...cart,
        [productId]: {
            ...cart[productId],
            quantity: (cart[productId]?.quantity || 0) + quantity,
        },
    })
}

export function removeFromCart(productId: string) {
    const cart = cartItems.get()
    const newCart = { ...cart }

    delete newCart[productId]
    cartItems.set(newCart)
}

export function clearCart() {
    cartItems.set({})
}
loadCart()
