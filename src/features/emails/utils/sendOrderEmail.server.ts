import { render } from 'jsx-email';
import { Resend } from 'resend';
import type { Stripe } from 'stripe';

import type { Product } from '@/types/shop';

import { ReceiptEmail } from '@/features/emails/templates/ReceiptEmail';
import { PaymentFailedEmail } from '@/features/emails/templates/PaymentFailedEmail';
import { buildEmailOrderData } from '@/features/emails/utils/buildEmailOrderData.server';
import {
    buildPaymentFailedText,
    buildReceiptText
} from '@/features/emails/text/orderEmailText';

const resend = new Resend(process.env.RESEND_KEY || 're_...');

export async function sendOrderEmail(
    paymentIntent: Stripe.PaymentIntent,
    verifiedProducts: Record<string, Product>,
    success: boolean
) {
    const orderData = await buildEmailOrderData(paymentIntent, verifiedProducts);
    if (!orderData.to) {
        throw new Error('Receipt Email is not defined');
    }

    const subject = success ? 'Your Ro/Box Receipt' : 'Ro/Box Payment Failed';

    const element = success
        ? ReceiptEmail({
            name: orderData.name,
            date: orderData.date,
            orderId: orderData.orderId,
            items: orderData.items,
            shipping: orderData.shipping,
            discount: orderData.discount,
            total: orderData.total,
            address: orderData.address,
            billing: orderData.billing
        })
        : PaymentFailedEmail({
            name: orderData.name,
            date: orderData.date,
            orderId: orderData.orderId,
            items: orderData.items,
            shipping: orderData.shipping,
            discount: orderData.discount,
            total: orderData.total,
            billing: orderData.billing
        });

    const html = await render(element);
    // Hand-written rather than render(..., { plainText: true }); see orderEmailText.ts.
    const text = success ? buildReceiptText(orderData) : buildPaymentFailedText(orderData);

    await resend.emails.send({
        from: 'Ro/Box <hello@store.robox.com.au>',
        to: [orderData.to],
        subject,
        html,
        text
    });

    return { sent: true, to: orderData.to };
}
