import type { Product } from '@/types/shop'

export type ProductWithImage = Product & {
    imageSrc: string
}

export type CartQuantity = {
    quantity: number
}

export type CartItems = Record<string, CartQuantity>

export type CartEntry = {
    product: ProductWithImage
    quantity: number
}