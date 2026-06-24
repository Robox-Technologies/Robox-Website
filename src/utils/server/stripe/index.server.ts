import stripe from 'stripe'
import 'dotenv/config'

if (!process.env.STRIPE_SECRET_KEY) {
    throw new Error('STRIPE_SECRET_KEY is not defined in environment variables')
}
export const stripeAPI = new stripe(process.env.STRIPE_SECRET_KEY)



