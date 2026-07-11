import { map } from 'nanostores'
import type { CartItems } from '@/features/shop/cart/types/cart'

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