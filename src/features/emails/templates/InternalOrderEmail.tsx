import { Heading, Link, Section, Text } from 'jsx-email'

import { heading, testBannerStyle, testBannerTextStyle } from '../styles'
import { BillingDetails } from '../components/BillingDetails'
import { EmailLayout } from '../components/EmailLayout'
import { Masthead } from '../components/Masthead'
import { OrderSummary, type OrderItem } from '../components/OrderSummary'
import { PackingList, type PackingSummary } from '../components/PackingList'

export interface InternalOrderEmailProps {
    /** Who the order is for, as given at checkout. */
    customerName: string
    customerEmail: string
    /** Pre-formatted date string, e.g. "23 June 2026" */
    date: string
    orderId: string
    items: OrderItem[]
    shipping: string
    shippingMethod?: string
    discount?: string
    total: string
    /** Newline-separated delivery address. */
    address: string
    /** How to pack it, or null when the order recorded no plan. */
    packing: PackingSummary | null
    /** True when the payment was taken with Stripe's sandbox keys. */
    testMode: boolean
}

/** The order as it lands in hello@robox.com.au. A fulfilment document, so packing comes before money. */
export const InternalOrderEmail = ({
    customerName,
    customerEmail,
    date,
    orderId,
    items,
    shipping,
    shippingMethod,
    discount,
    total,
    address,
    packing,
    testMode,
}: InternalOrderEmailProps) => {
    return (
        <EmailLayout
            title={`${testMode ? '[TEST] ' : ''}New Ro/Box order`}
            previewText={
                testMode
                    ? `Sandbox test order from ${customerName} - nothing to pack.`
                    : `New order from ${customerName}, ${packing?.description ?? 'packing plan not recorded'}.`
            }
        >
            <Masthead />

            {/* Loud and first, so a sandbox order is never mistaken for one to pack. */}
            {testMode && (
                <Section style={testBannerStyle}>
                    <Text style={testBannerTextStyle}>
                        [TEST] Sandbox payment - do not pack or post this order.
                    </Text>
                </Section>
            )}

            <Heading as="h1" style={heading('h1')}>
                New order from {customerName}
            </Heading>

            <BillingDetails
                rows={[
                    { label: 'Customer:', value: customerName },
                    {
                        label: 'Email:',
                        value: (
                            <Link href={`mailto:${customerEmail}`}>
                                {customerEmail}
                            </Link>
                        ),
                    },
                    { label: 'Deliver to:', value: address },
                    {
                        label: 'Shipping:',
                        value: shippingMethod ?? 'Not recorded',
                    },
                ]}
            />

            <PackingList packing={packing} />

            <OrderSummary
                orderId={orderId}
                date={date}
                items={items}
                shipping={shipping}
                shippingMethod={shippingMethod}
                discount={discount}
                total={total}
            />
        </EmailLayout>
    )
}

/**
 * Sample data for `email build --use-preview-props` / `email preview`.
 * `testMode` is on so the preview exercises the sandbox banner.
 */
export const previewProps: InternalOrderEmailProps = {
    customerName: 'Ada Lovelace',
    customerEmail: 'ada@example.com',
    date: '23 June 2026',
    orderId: 'pi_3RvKq2CZ6qsJgndP1a2Bc3De',
    items: [
        { name: 'Ro/Box Starter Kit', quantity: 1, subtotal: 'AU$129.00' },
        { name: 'Sensor Pack', quantity: 2, subtotal: 'AU$58.00' },
    ],
    shipping: 'AU$9.95',
    shippingMethod: 'Express shipping',
    discount: 'AU$10.00',
    total: 'AU$186.95',
    address: '42 Analytical Engine Way\nMelbourne VIC 3000\nAustralia',
    packing: {
        description: '1 large satchel, 1 box',
        parcels: [
            {
                label: 'large satchel',
                contents: '2x Sensor Pack',
                dimensions: '48.5x36x5cm',
                weight: '400g',
            },
            {
                label: 'box',
                contents: '1x Ro/Box Starter Kit',
                dimensions: '24x16x8cm',
                weight: '500g',
            },
        ],
        totalWeight: '900g',
        unlistedParcels: 0,
    },
    testMode: true,
}

export const Template = InternalOrderEmail
