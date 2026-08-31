import type { OrderItem } from '@/features/emails/components/OrderSummary';

/**
 * Plain-text bodies for the transactional emails.
 *
 * Ported from the original site's success.txt / failure.txt and the
 * partials/summary.txt / partials/signature.txt fragments, which were assembled
 * by `{{token}}` replacement.
 *
 * These are hand-written rather than derived from the HTML. jsx-email's
 * `render(el, { plainText: true })` runs the markup through html-to-text, which
 * renders every link twice ("hello@robox.com.au hello@robox.com.au",
 * "+61 422 987 506 tel:+61422987506"), runs the three social URLs together on
 * one line, uppercases headings, and leaks the masthead link URL as the first
 * line of the message.
 */

export interface OrderEmailTextData {
    name: string;
    /** Pre-formatted date string, e.g. "23 June 2026" */
    date: string;
    orderId: string;
    items: OrderItem[];
    /** Pre-formatted shipping cost string, e.g. "AU$9.95" */
    shipping: string;
    /** Service the order ships by, e.g. "Express shipping". */
    shippingMethod?: string;
    /** Pre-formatted discount amount, or undefined when none applies. */
    discount?: string;
    /** Pre-formatted grand total string. */
    total: string;
    /** Newline-separated shipping address. */
    address: string;
    /** Newline-separated payment-method details. */
    billing: string;
}

/** partials/signature.txt */
const SIGNATURE = `Cheers,
The Ro/Box Team

---

Ro/Box Technologies
20 Coleridge Street
Elwood VIC 3184
Australia

ABN 89 684 550 249
hello@robox.com.au
+61 422 987 506`;

/** partials/summary.txt */
function buildSummary(data: OrderEmailTextData): string {
    const items = data.items
        .map((item) => `${item.name} × ${item.quantity}: ${item.subtotal}`)
        .join('\n');

    const discount = data.discount ? `\nDiscount: (${data.discount})` : '';

    return `Order ID: ${data.orderId}
Date: ${data.date}

${items}
===================
${data.shippingMethod ?? 'Shipping'}: ${data.shipping}${discount}
===================
Total: ${data.total}`;
}

/** success.txt */
export function buildReceiptText(data: OrderEmailTextData): string {
    return `Dear ${data.name},

Thank you for your purchase! Please see your order details below.


${buildSummary(data)}

Shipping to:
${data.address}

Billed to:
${data.billing}


If you have any questions about this receipt, simply reply to this email or reach out to us at hello@robox.com.au for help.


${SIGNATURE}`;
}

/** failure.txt */
export function buildPaymentFailedText(data: OrderEmailTextData): string {
    return `Dear ${data.name},

We were unable to process your payment for your recent order on ${data.date}.
Please see your order details below.


${buildSummary(data)}

Payment details:
${data.billing}


Please check your payment details and try again.
If you believe this is a mistake, please contact us at hello@robox.com.au for assistance.


${SIGNATURE}`;
}
