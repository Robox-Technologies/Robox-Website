import { map } from 'nanostores'
import type { CartItems } from '../types/cart'
import { clampQuantity, toQuantity } from './quantity'

const cartKey = 'roboxCart'

const initialCart: CartItems = loadCart()
export const cartItems = map<CartItems>(initialCart)

cartItems.subscribe((value) => {
    if (typeof window === 'undefined') return
    localStorage.setItem(cartKey, JSON.stringify(value))
})

function loadCart(): CartItems {
    if (typeof window === 'undefined') return {}

    const cart = localStorage.getItem(cartKey)
    if (!cart) return {}

    try {
        return JSON.parse(cart) as CartItems
    } catch (e) {
        console.error('Failed to parse cart:', e)
        localStorage.removeItem(cartKey)
        return {}
    }
}

export function addToCart(productId: string, quantity = 1) {
    const cart = cartItems.get()
    const nextQuantity = clampQuantity((cart[productId]?.quantity || 0) + toQuantity(quantity))

    if (nextQuantity === 0) {
        removeFromCart(productId)
        return
    }

    cartItems.setKey(productId, {
        quantity: nextQuantity,
    })
}

export function setCartQuantity(productId: string, quantity: number) {
    const nextQuantity = clampQuantity(quantity)
    if (nextQuantity === 0) {
        removeFromCart(productId)
        return
    }

    cartItems.setKey(productId, {
        quantity: nextQuantity,
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