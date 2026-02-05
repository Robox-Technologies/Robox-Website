export type ProductList = Product[]
export type Product = {
    name: string,
    internalName?: string, // Used for filenames
    displayStatus?: string, // Used for display purposes
    description: string,
    banner?: string, // Banner text above product name
    images: string[],
    price_id: string,
    price: number,
    displayPrice: string, // Used for display purposes
    item_id: string,
    status: ProductStatus,
    weight: number,
    unitVolume: number // Volume (in Ro/Box kits) used to estimate the packaging volume required.
}
export type ProductStatus = "available" | "not-available" | "preorder"

export interface PaymentIntentCreationBody {
    products: Record<string, number>;
    expected_price: number;
}
export interface ShippingUpdateBody {
    paymentIntentID: string;
    products: Record<string, number>;
    country?: string;
    postcode?: string;
    coupon?: string; // Coupon ID or user-facing promotion code
}
export interface ProductsRequestQuery {
    id?: string; // Product ID to fetch specific product, or "quantity" for quantity product
}
export interface PaymentIntentCreationResponse {
    client_secret: string;
}