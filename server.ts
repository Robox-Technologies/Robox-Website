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



app.set("trust proxy", 1) // Trust the first proxy (if behind one, e.g., in production)
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

// --- Account functions ---

const supabaseUrl = process.env.SUPABASE_URL
const supabasePublishableKey = process.env.SUPABASE_PUBLISHABLE_KEY
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabasePublishableKey || !supabaseServiceRoleKey) {
    console.log("Missing Supabase environment variables");
}

// Delete account
app.post('/api/account/delete', async (req, res) => {
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

app.post('/api/account/email-check', async (req, res) => {
    // returns true = email exists
    // returns false = email does not exist
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const { email } = req.body ?? {};

    if (!email) {
        return res.status(400).json({ error: 'Email is required' });
    }

    const cleanEmail = String(email).trim().toLowerCase();

    if (!emailRegex.test(cleanEmail)) {
        return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    const supabase = createClient(supabaseUrl, supabaseServiceRoleKey);

    try {
        const { data, error } = await supabase
            .from('profiles')
            .select('email')
            .ilike('email', cleanEmail)
            .limit(1);

        if (error) {
            console.error('Supabase error:', error);
            return res.status(500).json({ error: 'Please try again later.' });
        }

        if (data && data.length > 0) {
            return res.json({ exists: true });
        }

        return res.json({ exists: false });
    } catch (err) {
        console.error('Unexpected error during email validation:', err);
        return res.status(500).json({ error: 'Unable to validate email' });
    }
});


// 404 for all other routes
app.use("/public", express.static(websiteDir + "/public", {
    setHeaders: (res, filePath) => {
        if (path.basename(filePath) === 'latest.pdf') {
                res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
                res.setHeader('Pragma', 'no-cache');
                res.setHeader('Expires', '0');
            }
        }
}));
app.get('*', (_, res) => {
    res.sendFile(path404);
});

app.use((_, res) => {
    res.status(404).sendFile(path404);
});


app.listen(3000, function () {
    console.log('Ro/Box website listening on port 3000!\n');
});
