import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import paymentRouter from "./store.js";
import rateLimit from "express-rate-limit";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const isDev = process.env.NODE_ENV !== 'production';


app.enable('trust proxy'); // Trust the first proxy (if behind one, e.g., in production)
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

if (isDev) {
    const webpack = (await import('webpack')).default;
    const webpackDevMiddleware = (await import('webpack-dev-middleware')).default;

    const imported = await import('./webpack.dev.config.js');
    const config = await imported.default();  // <-- call the async function to get config object
    const compiler = webpack(config);
    const devMiddleware = webpackDevMiddleware(compiler, {
            publicPath: config.output.publicPath || '/',
            stats: 'minimal'
        })
    app.use(
        devMiddleware
    );
    devMiddleware.waitUntilValid(() => {
        const fs = devMiddleware.context.outputFileSystem
        const notFoundFile = fs.readFileSync(path.join(compiler.outputPath, '404.html')).toString("utf-8");

        app.get('*', (_, res) => {
            res.status(404).send(notFoundFile);
        });
    });
} else {
    const websiteDir = path.resolve(__dirname, '../website');
    const path404 = path.join(websiteDir, '404.html');

    app.use("/", express.static(websiteDir));

    app.get('*', (_, res) => {
        res.sendFile(path404);
    });

    app.use((_, res) => {
        res.status(404).sendFile(path404);
    });
}

app.listen(3000, function () {
    console.log('Ro/Box website listening on port 3000!\n');
});
