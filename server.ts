import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import paymentRouter from "./store.js";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Absolute path to the website build output
const websiteDir = path.resolve(__dirname, '../website');
const path404 = path.join(websiteDir, '404.html');

app.use("/api/store", paymentRouter);
app.use(express.json());
app.use("/", express.static(websiteDir));

// 404 for all other routes
app.get('*', (_, res) => {
    res.sendFile(path404);
});
app.use((_, res) => {
    res.status(404).sendFile(path404);
});

app.listen(3000, function () {
    console.log('Ro/Box website listening on port 3000!\n');
});

import { getProductList, stripeAPI } from './stripe-server-helper.js';
import { processEmail } from './email.js';

const verifiedProducts = await getProductList()
const successPayment = await stripeAPI.paymentIntents.retrieve(process.env.SUCCESS_PI);
await processEmail(successPayment, verifiedProducts, true);
await processEmail(successPayment, verifiedProducts, false);