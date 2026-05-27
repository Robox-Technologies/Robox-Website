import { cartItems } from './cartStore'
import { clampQuantity, toQuantity } from '@features/shop/cart/utils/quantity'

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