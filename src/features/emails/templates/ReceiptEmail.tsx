import { Heading, Text } from 'jsx-email';

import { heading, textStyle } from '../styles';
import { BillingDetails } from '../components/BillingDetails';
import { EmailLayout } from '../components/EmailLayout';
import { Footer } from '../components/Footer';
import { Masthead } from '../components/Masthead';
import { OrderSummary, type OrderItem } from '../components/OrderSummary';
import { SignOff, SupportLink } from '../components/SignOff';
import { Socials } from '../components/Socials';

export interface ReceiptEmailProps {
    name: string;
    /** Pre-formatted date string, e.g. "23 June 2026" */
    date: string;
    orderId: string;
    items: OrderItem[];
    shipping: string;
    shippingMethod?: string;
    discount?: string;
    total: string;
    address: string;
    billing: string;
}

/**
 * "Your Ro/Box Receipt" email, sent after a successful purchase.
 * Converted from success.html (markup) and success.txt (plain-text copy).
 */
export const ReceiptEmail = ({
    name,
    date,
    orderId,
    items,
    shipping,
    shippingMethod,
    discount,
    total,
    address,
    billing
}: ReceiptEmailProps) => {
    return (
        <EmailLayout
            title="Your Ro/Box Receipt"
            previewText={`This is the receipt for your recent Ro/Box purchase on ${date}.`}
        >
            <Masthead />

            <Heading as="h1" style={heading('h1')}>
                Dear {name},
            </Heading>
            <Text style={textStyle}>
                Thank you for your purchase!
                <br />
                <br />
                Please see your order details below.
            </Text>

            <OrderSummary
                orderId={orderId}
                date={date}
                items={items}
                shipping={shipping}
                shippingMethod={shippingMethod}
                discount={discount}
                total={total}
            />

            <BillingDetails
                rows={[
                    { label: 'Shipping to:', value: address },
                    { label: 'Billed to:', value: billing }
                ]}
            />

            <SignOff>
                If you have any questions about this receipt, simply reply to this email or reach
                out to us at <SupportLink /> for help.
            </SignOff>

            <Socials />

            <Footer />
        </EmailLayout>
    );
};
 
/**
 * Sample data for `email build --use-preview-props` / `email preview`.
 * Amounts use `formatPrice`'s real "AU$" output so the preview matches production.
 */
export const previewProps: ReceiptEmailProps = {
    name: 'Ada Lovelace',
    date: '23 June 2026',
    orderId: 'pi_3RvKq2CZ6qsJgndP1a2Bc3De',
    items: [
        { name: 'Ro/Box Starter Kit', quantity: 1, subtotal: 'AU$129.00' },
        { name: 'Sensor Pack', quantity: 2, subtotal: 'AU$58.00' }
    ],
    shipping: 'AU$9.95',
    shippingMethod: 'Express shipping',
    discount: 'AU$10.00',
    total: 'AU$186.95',
    address: '42 Analytical Engine Way\nMelbourne VIC 3000\nAustralia',
    billing: 'Visa\nEnding in ••••4242\nExpires on 4/29'
};

export const Template = ReceiptEmail
