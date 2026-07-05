import { Stripe } from 'stripe'
import type { Product } from 'src/types/shop'

import type { OrderItem } from '@/features/emails/components/OrderSummary'
export interface EmailOrderData {
    to: string;
    name: string;
    date: string;
    orderId: string;
    items: OrderItem[];
    shipping: string;
    discount?: string;
    total: string;
    address: string;
    billing: string;
}
export type ProductEmail = Record<
    string,
    {
        quantity: number;
        price: number;
    }
>;
export function processPaymentIntent(
    paymentIntent: Stripe.PaymentIntent,
    verifiedProducts: Record<string, Product>
): [string, ProductEmail] {
    const metadata = paymentIntent.metadata;
    const products: Record<string, number> = JSON.parse(metadata.products || '{}');
    const emailProducts: ProductEmail = {};
 
    for (const [productId, quantity] of Object.entries(products)) {
        const product = verifiedProducts[productId];
        emailProducts[product.name] = {
            quantity,
            price: product.price * quantity
        };
    }
    return [paymentIntent.receipt_email ?? '', emailProducts];
}