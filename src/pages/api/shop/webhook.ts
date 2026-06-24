import type { APIRoute } from "astro";
import { stripeAPI } from "@/utils/server/stripe/index.server"
import {Stripe} from 'stripe';
import { sendOrderEmail } from "@/features/emails/utils/sendOrderEmail.server";
import { getAllProducts } from "@/utils/server/stripe/getAllProducts.server";
import type { Product } from "@/types/shop";
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
if (!endpointSecret) {
    throw new Error("Stripe Webhook secret not specified in .env")
}

export const POST = (async ({ request }) => {
    console.log('Received webhook event');
    const allProducts = await getAllProducts()

    const verifiedProducts: Record<string, Product> = Object.fromEntries(allProducts.map((product) => [product.item_id, product]))
    const signature = request.headers.get('stripe-signature');
    let event: Stripe.Event; 
    try {
        if (!request.body || !signature) {
            throw new Error("Request body not specified")
        }
        const body = await request.text();
        event = stripeAPI.webhooks.constructEvent(body, signature, endpointSecret);
    } catch (err) {
        console.error('⚠️  Webhook signature verification failed.', (err as Error).message);
        return new Response('Webhook signature verification failed.', {
            status: 400,
        });
    }
    switch (event.type) {
        case 'payment_intent.payment_failed':
        case 'payment_intent.succeeded': {
            const paymentIntent = event.data.object;
            if (!paymentIntent.receipt_email) {
                console.error('No receipt email provided for payment intent:', paymentIntent.id);
                return new Response("No receipt email provided", {
                    status: 400,
                })
            }
            try {
                await sendOrderEmail(paymentIntent, verifiedProducts, event.type === 'payment_intent.succeeded');
            } catch (error) {
                console.error('Error processing email:', error);
            }
            break;
        }
    }
    return new Response(null, { status: 200 });
}) satisfies APIRoute;

