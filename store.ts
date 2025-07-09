import cache from 'memory-cache'

// Idk how else to fix this (issue is that stripe.js is not recognised as a module)
import {Stripe} from 'stripe';
import { getProduct, getProductList, stripeAPI } from './stripe-server-helper.js';
import {processEmail, ProductEmail} from './email.js';

import express from 'express'
import { Request, Response } from 'express';
import { PaymentIntentCreationBody, ProductsRequestQuery } from 'types/api';
import { calculateTotalCost } from './src/root/stripe-shared-helper.js';

const paymentRouter = express.Router()

const PRODUCT_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const verifiedProducts = await getProductList()

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
paymentRouter.post('/webhook', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
    const signature = req.headers['stripe-signature'];

    let event: Stripe.Event;

    try {
        event = stripeAPI.webhooks.constructEvent(req.body, signature!, endpointSecret);
    } catch (err) {
        console.error('⚠️  Webhook signature verification failed.', (err as Error).message);
        res.status(400).send('Webhook Error');
        return;
    }
    switch (event.type) {
        case 'payment_intent.payment_failed':
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            if (!paymentIntent.receipt_email) {
                console.error('No receipt email provided for payment intent:', paymentIntent.id);
                res.status(400).send('No receipt email provided');
                return;
            }
            processEmail(paymentIntent, 'Your Order Receipt', verifiedProducts, event.type === 'payment_intent.succeeded') 
            break;
    }
    res.json({ received: true });
});

paymentRouter.use(express.json());


paymentRouter.post("/create", async (req: Request<object, object, PaymentIntentCreationBody>, res: Response): Promise<void> => {
    const products = req.body.products
    const expected_price = req.body.expected_price
    if (!products) {
        res.status(400).send({ error: "Products is not defined" });
        return 
    }
    const verifiedServerCost = calculateTotalCost(products, verifiedProducts);
    const verifiedServerTotal = verifiedServerCost.total
    const verifiedServerShipping = verifiedServerCost.shipping
    if (expected_price !== verifiedServerTotal) {
        res.status(400).send({error: "Server prices do not match the client prices"})
        return 
    }

    try {
        const paymentIntent = await stripeAPI.paymentIntents.create({
            amount: verifiedServerTotal,
            currency: 'aud',
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                products: JSON.stringify(products),
                shipping: JSON.stringify(verifiedServerShipping || {}),
            }
        });
        res.json({client_secret: paymentIntent.client_secret});
    } catch (err) {
        console.log(err)
        res.status(500).send({error: err})
    }
})

paymentRouter.get("/products", async (req: Request<object, object, object, ProductsRequestQuery>, res: Response): Promise<void> => {
    const productId = req.query["id"]
    if (productId) {
        if (productId === "quantity") {
            res.status(200).send(false)
            return 
        }
        const cachedProduct = cache.get(productId)
        if (cachedProduct) {
            res.send(cachedProduct)
            return 
        }
        const product = await getProduct(productId)
        if (!product) {
            res.status(400);
            return 
        }
        cache.put(productId, product, PRODUCT_CACHE_DURATION);
        res.send(product)
    } else {
        const cachedProducts = cache.get('products');
        if (cachedProducts) { 
            res.send(cachedProducts);
            return 
        }

        const products = await getProductList();
        cache.put('products', products, PRODUCT_CACHE_DURATION);
        res.send(products)
        return 
    }
})

export default paymentRouter