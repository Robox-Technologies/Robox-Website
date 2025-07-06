import cache from 'memory-cache'

// Idk how else to fix this (issue is that stripe.js is not recognised as a module)
import {Stripe} from 'stripe';
import { getProduct, getProductList, stripeAPI } from './stripe-helper.js';


import express from 'express'
import { Request, Response } from 'express';
import { Product, PaymentIntentCreationBody, ProductsRequestQuery } from 'types/api';
import { calculateTotalCost } from './src/root/stripe-helper.js';

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
        case 'payment_intent.succeeded':
            const paymentIntent = event.data.object as Stripe.PaymentIntent;
            console.log(`✅ Payment succeeded: ${paymentIntent.id}`);
            break;
        case 'payment_intent.payment_failed':
            const failedIntent = event.data.object as Stripe.PaymentIntent;
            console.log(`❌ Payment failed: ${failedIntent.id}`);
            break;
    }
    res.json({ received: true });
});

paymentRouter.use(express.json());

paymentRouter.post("/create", async (req: Request<{}, {}, PaymentIntentCreationBody>, res: Response): Promise<void> => {
    let products = req.body.products
    let expected_price = req.body.expected_price
    if (!products) {
        res.status(400).send({ error: "Products is not defined" });
        return 
    }
    if (!expected_price || typeof expected_price !== "number" || expected_price <= 0) {
        res.status(400).send({ error: "Expected price is not defined" });
        return 
    }
    let verifiedServerCost = calculateTotalCost(products, verifiedProducts).total;
    if (expected_price !== verifiedServerCost) {
        res.status(400).send({error: "Server prices do not match the client prices"})
        return 
    }

    try {
        const paymentIntent = await stripeAPI.paymentIntents.create({
            amount: verifiedServerCost * 100,
            currency: 'aud',
            automatic_payment_methods: {
                enabled: true,
            },
            metadata: {
                products: JSON.stringify(products),
            }
        });
        res.json({client_secret: paymentIntent.client_secret});
    } catch (err) {
        console.log(err)
        res.status(500).send({error: err})
    }
})

paymentRouter.get("/products", async (req: Request<{}, {}, {}, ProductsRequestQuery>, res: Response): Promise<void> => {
    let productId = req.query["id"]
    if (productId) {
        if (productId === "quantity") {
            res.status(200).send(false)
            return 
        }
        let cachedProduct = cache.get(productId)
        if (cachedProduct) {
            res.send(cachedProduct)
            return 
        }
        let product = await getProduct(productId)
        if (!product) {
            res.status(400);
            return 
        }
        cache.put(productId, product, PRODUCT_CACHE_DURATION);
        res.send(product)
    } else {
        let cachedProducts = cache.get('products');
        if (cachedProducts) { 
            res.send(cachedProducts);
            return 
        }

        let products = await getProductList();
        cache.put('products', products, PRODUCT_CACHE_DURATION);
        res.send(products)
        return 
    }
})

export default paymentRouter