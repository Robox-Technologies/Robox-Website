import type { EmailOrderData } from "@/utils/server/stripe/processPaymentIntent.server";
import { processPaymentIntent } from "@/utils/server/stripe/processPaymentIntent.server";
import type { Product } from "@/types/shop";
import { resolveBilling } from "@/utils/server/stripe/resolveBilling";
import { formatPrice } from "@/utils/formatPrice";
import type { OrderItem } from "@/features/emails/components/OrderSummary";
import { Stripe } from "stripe";
export async function buildEmailOrderData(
    paymentIntent: Stripe.PaymentIntent,
    verifiedProducts: Record<string, Product>
): Promise<EmailOrderData> {
    const [to, products] = processPaymentIntent(paymentIntent, verifiedProducts);
    const [address, billing] = await resolveBilling(paymentIntent);
 
    const date = new Date().toLocaleDateString('en-AU', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
 
    const orderId = paymentIntent.id;
    const total = formatPrice(paymentIntent.amount, true);
    const name = paymentIntent.shipping?.name || 'Customer';
 
    const shipping = formatPrice(Number(paymentIntent.metadata.shipping), true);
 
    let discount: string | undefined;
    const discountRaw = paymentIntent.metadata.discount;
    if (!isNaN(parseFloat(discountRaw))) discount = formatPrice(Number(discountRaw), true);
 
    const items: OrderItem[] = Object.entries(products).map(([productName, { quantity, price }]) => ({
        name: productName,
        quantity,
        subtotal: formatPrice(price, true)
    }));
 
    return {
        to,
        name,
        date,
        orderId,
        items,
        shipping,
        discount,
        total,
        address,
        billing
    };
}