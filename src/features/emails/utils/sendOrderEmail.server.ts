import { render } from 'jsx-email'
import { Resend } from 'resend'
import type { Stripe } from 'stripe'

import { ReceiptEmail } from '@/features/emails/templates/ReceiptEmail'
import { PaymentFailedEmail } from '@/features/emails/templates/PaymentFailedEmail'
import { buildEmailOrderData } from '@/features/emails/utils/buildEmailOrderData.server'
import {
    buildPaymentFailedText,
    buildReceiptText,
} from '@/features/emails/text/orderEmailText'

const resend = new Resend(process.env.RESEND_KEY || 're_...')

/**
 * The mailbox a human reads - deliberately not the `from` address, which has to
 * stay on the Resend-verified sending domain. A customer hitting reply reaches
 * someone here rather than the sending subdomain.
 */
const ORDER_MAILBOX = 'hello@robox.com.au'

export async function sendOrderEmail(
    session: Stripe.Checkout.Session,
    success: boolean,
) {
    const orderData = await buildEmailOrderData(session)
    if (!orderData.to) {
        throw new Error('Receipt Email is not defined')
    }

    // The order id is in the subject to keep each message in its own Gmail
    // thread. Gmail threads on subject + participants, and collapses whatever a
    // later message repeats from an earlier one in the thread behind a "..."
    // expander - with a fixed subject, every receipt after the customer's first
    // arrived with its masthead, totals table and footer folded away.
    const subject = success ? `Your Ro/Box Receipt` : `Ro/Box Payment Failed`

    // Both templates take the same order details; only the receipt also shows
    // the delivery address, since a failed payment isn't going anywhere. Shared
    // rather than restated so a new field cannot reach one template and not the
    // other.
    const shared = {
        name: orderData.name,
        date: orderData.date,
        orderId: orderData.orderId,
        items: orderData.items,
        shipping: orderData.shipping,
        shippingMethod: orderData.shippingMethod,
        discount: orderData.discount,
        total: orderData.total,
        billing: orderData.billing,
    }

    const element = success
        ? ReceiptEmail({ ...shared, address: orderData.address })
        : PaymentFailedEmail(shared)

    const html = await render(element)
    // Hand-written rather than render(..., { plainText: true }); see orderEmailText.ts.
    const text = success
        ? buildReceiptText(orderData)
        : buildPaymentFailedText(orderData)

    // Resend reports API failures in the resolved value rather than by
    // throwing, so an invalid key, a suspended domain or a rejected recipient
    // all came back looking like a successful send. A receipt that silently
    // didn't arrive is worse than a loud failure - the caller logs this, and
    // Stripe will retry the webhook.
    const { data, error } = await resend.emails.send({
        from: 'Ro/Box <hello@store.robox.com.au>',
        to: [orderData.to],
        replyTo: ORDER_MAILBOX,
        subject,
        html,
        text,
    })

    if (error) {
        throw new Error(
            `Resend rejected the ${success ? 'receipt' : 'payment failed'} email for ${orderData.to}: ${error.message}`,
        )
    }

    return { sent: true, to: orderData.to, id: data?.id }
}
