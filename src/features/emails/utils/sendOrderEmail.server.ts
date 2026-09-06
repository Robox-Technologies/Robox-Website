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
    // Shared so a new field can't reach one template and not the other.
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
        // The order id keeps each receipt in its own Gmail thread; Gmail threads on
        // subject and folds away whatever a later message repeats.
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

/** The fulfilment copy for our own inbox. Paid orders only. */
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

/** Resend reports API failures in the resolved value rather than throwing, so check for them. */
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

    // Independent, so a rejected internal copy can't cost the customer their receipt.
    // Either failing still fails the webhook, which Stripe retries.
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
