import { loadStripe } from '@stripe/stripe-js'

const publishableKey = import.meta.env.PUBLIC_STRIPE_PUBLISHABLE_KEY

if (!publishableKey) {
    throw new Error(
        'PUBLIC_STRIPE_PUBLISHABLE_KEY is not defined in environment variables',
    )
}

export const stripePromise = loadStripe(publishableKey)