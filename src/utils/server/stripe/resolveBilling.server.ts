import type { Stripe } from 'stripe';
 
import { stripeAPI } from '@/utils/server/stripe/index.server';
import { readPaymentMethod } from '@/utils/server/stripe/readPayment.server';
import { titleCase } from '@/utils/titleCase';
import iso3311a2 from 'iso-3166-1-alpha-2';

export async function resolveBilling(paymentIntent: Stripe.PaymentIntent): Promise<[string, string]> {
    // Address
    const address = paymentIntent.shipping?.address;
    const addressLines: string[] = [];
 
    if (address) {
        if (address.line1) addressLines.push(address.line1);
        if (address.line2) addressLines.push(address.line2);
 
        const cityStateZip = [address.city, address.state, address.postal_code]
            .filter(Boolean)
            .join(' ');
        if (cityStateZip) addressLines.push(cityStateZip);
 
        if (address.country) {
            const countryName = iso3311a2.getCountry(address.country);
            if (countryName) addressLines.push(countryName);
        }
    }
 
    // Billing / payment method
    const billingLines: string[] = [];
    const stripePaymentData =
        paymentIntent.payment_method ?? paymentIntent.last_payment_error?.payment_method;
 
    if (stripePaymentData) {
        let paymentMethod: Stripe.PaymentMethod | undefined;
 
        if (typeof stripePaymentData === 'string') {
            paymentMethod = await stripeAPI.paymentMethods.retrieve(stripePaymentData);
        } else {
            paymentMethod = stripePaymentData;
        }
 
        if (paymentMethod) {
            const paymentType = readPaymentMethod(paymentMethod);
 
            if (paymentType.name) billingLines.push(titleCase(paymentType.name));
            if (paymentType.userID) billingLines.push(paymentType.userID);
            if (paymentType.last4) billingLines.push(`Ending in ••••${paymentType.last4}`);
            if (paymentType.exp_month && paymentType.exp_year) {
                billingLines.push(`Expires on ${paymentType.exp_month}/${paymentType.exp_year % 1000}`);
            }
        }
    }
 
    return [addressLines.join('\n'), billingLines.join('\n')];
}