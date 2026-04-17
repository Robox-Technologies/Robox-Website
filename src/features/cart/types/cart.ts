import type { Product } from '@/types/shop'

export type ProductWithImage = Product & {
    imageSrc: string
}

export type CartEntry = {
    product: ProductWithImage
    quantity: number
}