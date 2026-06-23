import * as React from 'react';
import { Column, Heading, Row, Section, Text } from 'jsx-email';

export interface OrderItem {
    /** Item / product name */
    name: string;
    quantity: number;
    /** Pre-formatted subtotal string, e.g. "$49.00" */
    subtotal: string;
}

export interface OrderSummaryProps {
    orderId: string;
    /** Pre-formatted date string, e.g. "23 June 2026" */
    date: string;
    items: OrderItem[];
    /** Pre-formatted shipping cost string, e.g. "$9.95" or "Free" */
    shipping: string;
    /**
     * Pre-formatted discount line, e.g. "-$10.00 (WELCOME10)".
     * Mirrors `{{discount}}` in summary.txt, which is appended directly after
     * the shipping line and is empty/omitted when no discount applies.
     */
    discount?: string;
    /** Pre-formatted grand total string, e.g. "$58.95" */
    total: string;
}

const headingCellStyle: React.CSSProperties = { textAlign: 'left' };
const rowSeparateStyle: React.CSSProperties = { borderBottom: '1px solid #FF6166' };
const feeRowStyle: React.CSSProperties = { borderTop: '1px solid #FF6166' };

/**
 * Order summary table: order id, date, line items, then a shipping / discount /
 * total breakdown. Mirrors summary.html (HTML) and summary.txt (plain text).
 */
export const OrderSummary = ({
    orderId,
    date,
    items,
    shipping,
    discount,
    total
}: OrderSummaryProps) => {
    return (
        <Section style={{ marginTop: '32px' }}>
            <Heading as="h3" m={0} mb={8}>
                Order ID: {orderId}
            </Heading>
            <Heading as="h3" m={0} mb={16}>
                Date: {date}
            </Heading>

            <Section style={{ width: '100%', margin: 0, padding: '25px 0 0 0' }}>
                <Row style={rowSeparateStyle}>
                    <Column style={headingCellStyle}>
                        <Text style={{ margin: '16px 0', fontWeight: 'bold' }}>Item</Text>
                    </Column>
                    <Column align="center" style={{ textAlign: 'center' }}>
                        <Text style={{ margin: '16px 0', fontWeight: 'bold' }}>Quantity</Text>
                    </Column>
                    <Column align="right" style={{ textAlign: 'right' }}>
                        <Text style={{ margin: '16px 0', fontWeight: 'bold' }}>Subtotal</Text>
                    </Column>
                </Row>

                {items.map((item, index) => (
                    <Row key={`${item.name}-${index}`}>
                        <Column style={headingCellStyle}>
                            <Text style={{ margin: '16px 0' }}>{item.name}</Text>
                        </Column>
                        <Column align="center" style={{ textAlign: 'center' }}>
                            <Text style={{ margin: '16px 0' }}>{item.quantity}</Text>
                        </Column>
                        <Column align="right" style={{ textAlign: 'right' }}>
                            <Text style={{ margin: '16px 0' }}>{item.subtotal}</Text>
                        </Column>
                    </Row>
                ))}

                <Row style={feeRowStyle}>
                    <Column style={headingCellStyle}>
                        <Text style={{ margin: '16px 0' }}>Shipping</Text>
                    </Column>
                    <Column align="center" style={{ textAlign: 'center' }} />
                    <Column align="right" style={{ textAlign: 'right' }}>
                        <Text style={{ margin: '16px 0' }}>{shipping}</Text>
                    </Column>
                </Row>

                {discount && (
                    <Row>
                        <Column style={headingCellStyle} colSpan={2}>
                            <Text
                                style={{
                                    margin: 0,
                                    marginTop: 0,
                                    fontStyle: 'italic',
                                    color: '#4AA21E'
                                }}
                            >
                                Discount
                            </Text>
                        </Column>
                        <Column align="right" style={{ textAlign: 'right' }}>
                            <Text
                                style={{
                                    margin: 0,
                                    marginTop: 0,
                                    fontStyle: 'italic',
                                    color: '#4AA21E'
                                }}
                            >
                                {discount}
                            </Text>
                        </Column>
                    </Row>
                )}

                <Row style={{ margin: 0 }}>
                    <Column
                        style={{
                            textAlign: 'left',
                            padding: '0 15px 0 0',
                            verticalAlign: 'middle'
                        }}
                    >
                        <Text style={{ margin: '16px 0', fontWeight: 'bold', textAlign: 'left' }}>
                            Total
                        </Text>
                    </Column>
                    <Column style={{ width: '15%', minWidth: '90px', verticalAlign: 'middle' }} />
                    <Column style={{ verticalAlign: 'middle', width: '15%', minWidth: '90px' }}>
                        <Text style={{ margin: '16px 0', fontWeight: 'bold', textAlign: 'right' }}>
                            {total}
                        </Text>
                    </Column>
                </Row>
            </Section>
        </Section>
    );
};

export default OrderSummary;
