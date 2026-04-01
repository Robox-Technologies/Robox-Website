export type Product = {
    name: string
    internalName: string
    description: string
    banner: string
    price: number
    item_id: string
    status: ProductStatus
    weight: number
    unitVolume: number
}
export type ProductStatus = 'available' | 'not-available' | 'preorder'
