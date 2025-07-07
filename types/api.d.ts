export type ProductList = Product[]
export type Product = {
    name: string,
    internalName?: string, // Used for filenames
    displayStatus?: string, // Used for display purposes
    description: string,
    images: string[],
    price_id: string,
    price: number,
    item_id: string,
    status: ProductStatus
}
export type ProductStatus = "available" | "not-available" | "preorder"

export interface PaymentIntentCreationBody {
    products: Record<string, number>;
    expected_price: number;
}
export interface ProductsRequestQuery {
    id?: string; // Product ID to fetch specific product, or "quantity" for quantity product
}
export interface ProductsRequestQuery {
    id?: string; // Product ID to fetch specific product, or "quantity" for quantity product
}
export interface PaymentIntentCreationResponse {
    client_secret: string;
}