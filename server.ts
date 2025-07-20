import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import paymentRouter from "./store.js";
import rateLimit from "express-rate-limit";
import { createClient } from '@supabase/supabase-js'
import 'dotenv/config'

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Rate limit 3000 requests per minute
// Landing page makes ~40 requests per load,
// so this is equivalent to 75 page loads/min
app.use(rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 3000,
    message: "We know you love Ro/Box, but you've sent too many requests. Please try again later.",
    handler: (req, res, _, options) => {
        console.log(`${req.ip} was rate limited.`);
        res.status(options.statusCode).send(options.message);
    }
}));

// API rate limit of 70 requests/min
const apiRateLimit = rateLimit({
    windowMs: 60 * 1000, // 1 minute
    max: 70,
    message: "We know you love Ro/Box, but you've sent too many requests. Please try again later.",
    handler: (req, res, _, options) => {
        console.log(`${req.ip} was rate limited.`);
        res.status(options.statusCode).send(options.message);
    }
});

// Absolute path to the website build output
const websiteDir = path.resolve(__dirname, '../website');
const path404 = path.join(websiteDir, '404.html');

app.use("/api/store", apiRateLimit, paymentRouter);
app.use(express.json());
app.use("/", express.static(websiteDir));

// --- Account functions ---

// Delete account
app.post('/api/account/delete', async (req, res) => {
    const supabaseUrl = process.env.SUPABASE_URL
    const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY
    const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    if (!supabaseUrl || !supabasePublishableKey || !supabaseServiceRoleKey) {
        return res.status(400).json({ error: 'Missing Supabase environment variables' });
    }

    const token = req.headers.authorization?.replace('Bearer ', '')

    const adminClient = createClient(
        supabaseUrl, supabaseServiceRoleKey
    )

    const userClient = createClient(
        supabaseUrl, supabasePublishableKey,
        {
            global: {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        }
    )

    const { data: { user }, error: userError } = await userClient.auth.getUser()
    const userId = user.id

    if (userError || !user?.id) {
        return res.status(401).json({ error: 'Invalid or expired token' })
    }

    // Delete user from auth
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId)
    if (deleteError) {
        return res.status(500).json({ error: deleteError.message })
    }

    // Remove user from "profiles" table
    await adminClient.from('profiles').delete().eq('id', userId)
    return res.json({ success: true })
});

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