import { loadStripe } from '@stripe/stripe-js'
// Declared in `astro.config.ts` under `env.schema`: the key is not
// `PUBLIC_`-prefixed, so `import.meta.env` does not carry it to the client.
import { STRIPE_PUBLISHABLE_KEY } from 'astro:env/client'

if (!STRIPE_PUBLISHABLE_KEY) {
    throw new Error(
        'STRIPE_PUBLISHABLE_KEY is not defined in environment variables',
    )
}

export const stripePromise = loadStripe(STRIPE_PUBLISHABLE_KEY)
