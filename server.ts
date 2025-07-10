import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import paymentRouter from "./store.js";
import RateLimit from "express-rate-limit";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Rate limit 3000 requests per minute
// Landing page makes ~40 requests per load,
// so this is equivalent to 75 page loads/min
app.use(RateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 3000,
    message: "You've been rate limited! Please try again later."
}));

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