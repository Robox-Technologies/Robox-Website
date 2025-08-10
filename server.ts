import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import paymentRouter from "./store.js";
import rateLimit from "express-rate-limit";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);


// Rate limit 3000 requests per minute
app.use(rateLimit({
    windowMs: 60 * 1000,
    max: 3000,
    message: "We know you love Ro/Box, but you've sent too many requests. Please try again later.",
    handler: (req, res, _, options) => {
        console.log(`${req.ip} was rate limited.`);
        res.status(options.statusCode).send(options.message);
    }
}));

// API rate limit of 70 requests/min
const apiRateLimit = rateLimit({
    windowMs: 60 * 1000,
    max: 70,
    message: "We know you love Ro/Box, but you've sent too many requests. Please try again later.",
    handler: (req, res, _, options) => {
        console.log(`${req.ip} was rate limited.`);
        res.status(options.statusCode).send(options.message);
    }
});

app.use("/api/store", apiRateLimit, paymentRouter);
app.use(express.json());

const websiteDir = path.resolve(__dirname, '../website');
const path404 = path.join(websiteDir, '404.html');

app.use("/", express.static(websiteDir));

app.get('*', (_, res) => {
    res.sendFile(path404);
});

app.listen(3000, function () {
    console.log('Ro/Box website listening on port 3333!\n');
});
