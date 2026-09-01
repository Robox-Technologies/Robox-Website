import type { OrderItem } from '@/features/emails/components/OrderSummary';
import type { PackingSummary } from '@/features/emails/components/PackingList';

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

/** What the internal order email needs on top of the customer-facing fields. */
export interface InternalOrderTextData extends OrderEmailTextData {
    /** The customer's email address. */
    to: string;
    packing: PackingSummary | null;
    testMode: boolean;
}

function buildPacking(packing: PackingSummary | null): string {
    if (!packing || packing.parcels.length === 0) {
        return packing?.description
            ? `${packing.description} - no parcel breakdown was recorded for this order.`
            : 'No packing plan was recorded for this order. Pack it by hand from the items above.';
    }

    const parcels = packing.parcels
        .map(
            (parcel, index) =>
                `${index + 1}. ${parcel.label}: ${parcel.contents} - ${parcel.dimensions}, ${parcel.weight}`
        )
        .join('\n');

    const total = packing.totalWeight ? `\nTotal weight: ${packing.totalWeight}` : '';
    const unlisted =
        packing.unlistedParcels > 0
            ? `\n+ ${packing.unlistedParcels} further parcel${packing.unlistedParcels === 1 ? '' : 's'} not listed - see the payment in Stripe for the full plan.`
            : '';

    return `${packing.description}${total}\n\n${parcels}${unlisted}`;
}

/**
 * Subject line for the internal notice.
 *
 * Carries the order id for the same Gmail-threading reason as the receipt, and
 * the customer's name so the inbox is scannable.
 *
 * A sandbox order is marked `[TEST]` up front, so a test is never mistaken for
 * one to pack. `testMode` is Stripe's own `livemode`, so it tracks which set of
 * keys took the payment rather than which hostname served the checkout.
 */
export function buildInternalOrderSubject(data: InternalOrderTextData): string {
    const prefix = data.testMode ? '[TEST] ' : '';
    return `${prefix}New order - ${data.name} (${data.orderId})`;
}

/**
 * The internal fulfilment notice. No signature block: this is a work order
 * going to our own inbox, not a letter to anyone.
 */
export function buildInternalOrderText(data: InternalOrderTextData): string {
    const banner = data.testMode
        ? '[TEST] Sandbox payment - do not pack or post this order.\n\n'
        : '';

    return `${banner}New order from ${data.name}

Customer: ${data.name}
Email: ${data.to}
Shipping: ${data.shippingMethod ?? 'Not recorded'}

Deliver to:
${data.address}


PACKAGING
${buildPacking(data.packing)}


${buildSummary(data)}`;
}
