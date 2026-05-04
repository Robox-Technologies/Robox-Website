import type { Product } from '@/types/shop'

export type CartQuantity = {
    quantity: number
}

export type CartItems = Record<string, CartQuantity>

export type CartEntry = {
    product: Product
    quantity: number
}