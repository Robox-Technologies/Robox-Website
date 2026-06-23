import { Heading, Text } from 'jsx-email';

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

            <Heading as="h1">Dear {name},</Heading>
            <Text>
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
 
export const previewProps: ReceiptEmailProps = {
    name: 'Ada Lovelace',
    date: '23 June 2026',
    orderId: 'RB-10293',
    items: [
        { name: 'Ro/Box Starter Kit', quantity: 1, subtotal: '$129.00' },
        { name: 'Sensor Pack', quantity: 2, subtotal: '$58.00' }
    ],
    shipping: '$9.95',
    discount: '-$10.00 (WELCOME10)',
    total: '$186.95',
    address: 'Ada Lovelace\n42 Analytical Engine Way\nMelbourne VIC 3000\nAustralia',
    billing: 'Visa ending in 4242'
};

export const Template = ReceiptEmail
