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

// Save cart whenever it changes
cartItems.subscribe((value) => {
    if (typeof window === 'undefined') return
    localStorage.setItem(cartKey, JSON.stringify(value))
})
export function addToCart(productId: string, quantity = 1) {
    const cart = cartItems.get()
    cartItems.setKey(productId, {
        quantity: (cart[productId]?.quantity || 0) + quantity,
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