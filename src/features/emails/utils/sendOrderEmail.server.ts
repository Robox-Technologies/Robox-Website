import { render } from 'jsx-email'
import { Resend } from 'resend'
import type { Stripe } from 'stripe'

import { ReceiptEmail } from '@/features/emails/templates/ReceiptEmail'
import { PaymentFailedEmail } from '@/features/emails/templates/PaymentFailedEmail'
import { InternalOrderEmail } from '@/features/emails/templates/InternalOrderEmail'
import {
    buildEmailOrderData,
    type EmailOrderData,
} from '@/features/emails/utils/buildEmailOrderData.server'
import {
    buildInternalOrderSubject,
    buildInternalOrderText,
    buildPaymentFailedText,
    buildReceiptText,
} from '@/features/emails/text/orderEmailText'

const resend = new Resend(process.env.RESEND_KEY || 're_...')

/** The mailbox a human reads. Not the `from` address, which stays on the Resend-verified domain. */
const ORDER_MAILBOX = 'hello@robox.com.au'

const FROM = 'Ro/Box <hello@store.robox.com.au>'

/** One rendered message, ready to hand to Resend. */
interface OutgoingEmail {
    /** Names this message in an error, e.g. "receipt". */
    kind: string
    to: string
    subject: string
    replyTo: string
    html: string
    text: string
}

async function buildCustomerEmail(
    orderData: EmailOrderData,
    success: boolean,
): Promise<OutgoingEmail> {
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

    return {
        kind: success ? 'receipt' : 'payment failed',
        to: orderData.to,
        // The order id is in the subject to keep each message in its own Gmail
        // thread. Gmail threads on subject + participants, and collapses
        // whatever a later message repeats from an earlier one in the thread
        // behind a "..." expander - with a fixed subject, every receipt after
        // the customer's first arrived with its masthead, totals table and
        // footer folded away.
        subject: success ? `Your Ro/Box Receipt` : `Ro/Box Payment Failed`,
        replyTo: ORDER_MAILBOX,
        html: await render(element),
        // Hand-written rather than render(..., { plainText: true }); see
        // orderEmailText.ts.
        text: success
            ? buildReceiptText(orderData)
            : buildPaymentFailedText(orderData),
    }
}

/**
 * The fulfilment copy that lands in our own inbox: who ordered, where it goes,
 * how to pack it and what is in it.
 *
 * Only for a paid order - a failed payment has nothing to pack.
 */
async function buildInternalEmail(
    orderData: EmailOrderData,
): Promise<OutgoingEmail> {
    const element = InternalOrderEmail({
        customerName: orderData.name,
        customerEmail: orderData.to,
        date: orderData.date,
        orderId: orderData.orderId,
        items: orderData.items,
        shipping: orderData.shipping,
        shippingMethod: orderData.shippingMethod,
        discount: orderData.discount,
        total: orderData.total,
        address: orderData.address,
        packing: orderData.packing,
        testMode: orderData.testMode,
    })

    return {
        kind: 'internal order',
        to: ORDER_MAILBOX,
        subject: buildInternalOrderSubject(orderData),
        // Replying to the notification reaches the customer, which is the only
        // reply anyone would want to send from it.
        replyTo: orderData.to,
        html: await render(element),
        text: buildInternalOrderText(orderData),
    }
}

/**
 * Resend reports API failures in the resolved value rather than by throwing, so
 * an invalid key, a suspended domain or a rejected recipient all came back
 * looking like a successful send. A receipt that silently didn't arrive is
 * worse than a loud failure - the caller logs this, and Stripe will retry the
 * webhook.
 */
async function send(email: OutgoingEmail): Promise<string | undefined> {
    const { data, error } = await resend.emails.send({
        from: FROM,
        to: [email.to],
        replyTo: email.replyTo,
        subject: email.subject,
        html: email.html,
        text: email.text,
    })

    if (error) {
        throw new Error(
            `Resend rejected the ${email.kind} email for ${email.to}: ${error.message}`,
        )
    }

    return data?.id
}

export async function sendOrderEmail(
    session: Stripe.Checkout.Session,
    success: boolean,
) {
    const orderData = await buildEmailOrderData(session)
    if (!orderData.to) {
        throw new Error('Receipt Email is not defined')
    }

    const emails = [await buildCustomerEmail(orderData, success)]
    if (success) {
        emails.push(await buildInternalEmail(orderData))
    }

    // Sent independently rather than one after the other, so a rejection of the
    // internal copy cannot cost the customer their receipt. Both are still
    // reported as a failure, because an order nobody is told to pack is as bad
    // as one the customer never heard about - Stripe retries the webhook, at
    // the cost of re-sending whichever of the two did get through.
    const results = await Promise.allSettled(emails.map(send))

    const failures = results.filter((result) => result.status === 'rejected')
    if (failures.length > 0) {
        throw new Error(
            failures
                .map(
                    (failure) =>
                        failure.reason?.message ?? String(failure.reason),
                )
                .join('; '),
        )
    }

    const [customer] = results
    return {
        sent: true,
        to: orderData.to,
        id: customer?.status === 'fulfilled' ? customer.value : undefined,
    }
}
