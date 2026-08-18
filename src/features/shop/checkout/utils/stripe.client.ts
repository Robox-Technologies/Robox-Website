import { loadStripe } from '@stripe/stripe-js'

const publishableKey = import.meta.env.STRIPE_PUBLISHABLE_KEY

if (!publishableKey) {
    throw new Error(
        'STRIPE_PUBLISHABLE_KEY is not defined in environment variables',
    )
}

export const stripePromise = loadStripe(publishableKey)