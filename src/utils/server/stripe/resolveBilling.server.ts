import type { Stripe } from 'stripe'

import { stripeAPI } from '@/utils/server/stripe/index.server'
import { readPaymentMethod } from '@/utils/server/stripe/readPayment.server'
import { titleCase } from '@/utils/titleCase'
import iso3311a2 from 'iso-3166-1-alpha-2'

export interface ResolvedBilling {
    /** Customer name, or null if no source has one. */
    name: string | null
    /** Newline-separated delivery address. */
    address: string
    /** Newline-separated payment-method details. */
    billing: string
}

function formatAddress(address: Stripe.Address | null | undefined): string {
    if (!address) return ''

    const lines: string[] = []

    if (address.line1) lines.push(address.line1)
    if (address.line2) lines.push(address.line2)

    const cityStateZip = [address.city, address.state, address.postal_code]
        .filter(Boolean)
        .join(' ')
    if (cityStateZip) lines.push(cityStateZip)

    if (address.country) {
        const countryName = iso3311a2.getCountry(address.country)
        if (countryName) lines.push(countryName)
    }

    return lines.join('\n')
}

async function resolvePaymentMethod(
    intent: Stripe.PaymentIntent | null,
): Promise<Stripe.PaymentMethod | undefined> {
    const source =
        intent?.payment_method ?? intent?.last_payment_error?.payment_method

    if (typeof source === 'string') {
        return stripeAPI.paymentMethods.retrieve(source)
    }
    return source ?? undefined
}

/**
 * Customer name, delivery address and payment-method details for the order emails. The
 * address comes from the PaymentIntent's `shipping`, which is the authoritative copy —
 * the session never collects one.
 */
export async function resolveBilling(
    session: Stripe.Checkout.Session,
): Promise<ResolvedBilling> {
    let intent: Stripe.PaymentIntent | null = null
    if (typeof session.payment_intent === 'string') {
        intent = await stripeAPI.paymentIntents.retrieve(
            session.payment_intent,
            { expand: ['payment_method'] },
        )
    } else {
        intent = session.payment_intent ?? null
    }

    const paymentMethod = await resolvePaymentMethod(intent)
    const billingDetails = paymentMethod?.billing_details

    const collectedShipping = session.collected_information?.shipping_details

    const name =
        intent?.shipping?.name ||
        collectedShipping?.name ||
        session.customer_details?.name ||
        billingDetails?.name ||
        null

    const address = formatAddress(
        intent?.shipping?.address ??
            collectedShipping?.address ??
            billingDetails?.address,
    )

    const billingLines: string[] = []

    if (paymentMethod) {
        const paymentType = readPaymentMethod(paymentMethod)

        if (paymentType.name) billingLines.push(titleCase(paymentType.name))
        if (paymentType.userID) billingLines.push(paymentType.userID)
        if (paymentType.last4) {
            billingLines.push(`Ending in ••••${paymentType.last4}`)
        }
        if (paymentType.exp_month && paymentType.exp_year) {
            billingLines.push(
                `Expires on ${paymentType.exp_month}/${paymentType.exp_year % 1000}`,
            )
        }
    }

    return { name, address, billing: billingLines.join('\n') }
}
