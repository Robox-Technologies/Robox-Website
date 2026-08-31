
import { Button, Heading, Section, Text } from 'jsx-email';

import { buttonStyle, cellStyle, heading, textStyle } from '../styles';
import { BillingDetails } from '../components/BillingDetails';
import { EmailLayout } from '../components/EmailLayout';
import { Footer } from '../components/Footer';
import { Masthead } from '../components/Masthead';
import { OrderSummary, type OrderItem } from '../components/OrderSummary';
import { SignOff, SupportLink } from '../components/SignOff';

export interface PaymentFailedEmailProps {
    name: string;
    /** Pre-formatted date string, e.g. "23 June 2026" */
    date: string;
    orderId: string;
    items: OrderItem[];
    shipping: string;
    shippingMethod?: string;
    discount?: string;
    total: string;
    billing: string;
}

/**
 * "Ro/Box Payment Failed" email, sent when an order's payment can't be processed.
 * Converted from failure.html (markup) and failure.txt (plain-text copy).
 */
export const PaymentFailedEmail = ({
    name,
    date,
    orderId,
    items,
    shipping,
    shippingMethod,
    discount,
    total,
    billing
}: PaymentFailedEmailProps) => {
    return (
        <EmailLayout
            title="Ro/Box Payment Failed"
            previewText={`Your Ro/Box payment on ${date} was not processed successfully.`}
        >
            <Masthead />

            <Heading as="h1" style={heading('h1')}>
                Dear {name},
            </Heading>
            <Text style={textStyle}>
                We were unable to process your payment for your recent order on {date}.
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

            <BillingDetails rows={[{ label: 'Payment details:', value: billing }]} />

            {/* `.button` in email.css: coral pill, centred, with 32px beneath it. */}
            <Section style={{ marginBottom: '32px' }}>
                <table
                    width="100%"
                    cellPadding={0}
                    cellSpacing={0}
                    border={0}
                    role="presentation"
                    style={{ width: '100%' }}
                >
                    <tbody>
                        <tr>
                            <td align="center" style={cellStyle}>
                                <Button href="https://robox.com.au/shop/cart" {...buttonStyle}>
                                    Retry Payment
                                </Button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </Section>

            <SignOff>
                Please check your payment details and try again. If you believe this is a mistake,
                please contact us at <SupportLink /> for assistance.
            </SignOff>

            <Footer />
        </EmailLayout>
    );
};
/**
 * Sample data for `email build --use-preview-props` / `email preview`.
 * Includes a discount so the discount row is exercised in the preview.
 */
export const previewProps: PaymentFailedEmailProps = {
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
    billing: 'Visa\nEnding in ••••4242\nExpires on 4/29'
};
export const Template = PaymentFailedEmail ;
