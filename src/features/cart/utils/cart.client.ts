import { map } from 'nanostores'

const cartKey = 'roboxCart'

type CartItems = Record<string, { quantity: number }>

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
    cartItems.setKey(productId, {
        quantity: (cart[productId]?.quantity || 0) + quantity,
    })
}

export function setCartQuantity(productId: string, quantity: number) {
    const nextQuantity = Math.min(Math.max(Number(quantity) || 0, 0), 99)
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