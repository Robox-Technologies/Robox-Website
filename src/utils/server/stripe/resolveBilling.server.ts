import type { Stripe } from 'stripe'

import { stripeAPI } from '@/utils/server/stripe/index.server'
import { readPaymentMethod } from '@/utils/server/stripe/readPayment.server'
import { titleCase } from '@/utils/titleCase'
import iso3311a2 from 'iso-3166-1-alpha-2'

export interface ResolvedBilling {
    /** Customer name, or null if neither source has one. */
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

/**
 * Pulls the customer name, delivery address and payment-method details off a
 * PaymentIntent for the receipt email.
 *
 * Name and address prefer `paymentIntent.shipping`, then fall back to the
 * payment method's `billing_details`. Checkout collects a single address via
 * <AddressElement mode="billing">, which Stripe attaches to the payment method
 * rather than to the intent, and `confirmPayment` is not passed a `shipping`
 * object - so in practice the fallback is the path that fires. The `shipping`
 * branch is kept first so this keeps working if the intent starts carrying one.
 */
export async function resolveBilling(
    paymentIntent: Stripe.PaymentIntent,
): Promise<ResolvedBilling> {
    const stripePaymentData =
        paymentIntent.payment_method ?? paymentIntent.last_payment_error?.payment_method

    let paymentMethod: Stripe.PaymentMethod | undefined

    if (typeof stripePaymentData === 'string') {
        paymentMethod = await stripeAPI.paymentMethods.retrieve(stripePaymentData)
    } else if (stripePaymentData) {
        paymentMethod = stripePaymentData
    }

    const billingDetails = paymentMethod?.billing_details

    const name = paymentIntent.shipping?.name || billingDetails?.name || null
    const address = formatAddress(paymentIntent.shipping?.address ?? billingDetails?.address)

    // Payment method summary
    const billingLines: string[] = []

    if (paymentMethod) {
        const paymentType = readPaymentMethod(paymentMethod)

        if (paymentType.name) billingLines.push(titleCase(paymentType.name))
        if (paymentType.userID) billingLines.push(paymentType.userID)
        if (paymentType.last4) billingLines.push(`Ending in ••••${paymentType.last4}`)
        if (paymentType.exp_month && paymentType.exp_year) {
            billingLines.push(
                `Expires on ${paymentType.exp_month}/${paymentType.exp_year % 1000}`,
            )
        }
    }

    return { name, address, billing: billingLines.join('\n') }
}
