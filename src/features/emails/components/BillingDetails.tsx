import * as React from 'react';
import { Column, Heading, Row, Section, Text } from 'jsx-email';

export interface BillingRow {
    label: string;
    value: React.ReactNode;
}

export interface BillingDetailsProps {
    rows: BillingRow[];
}

/**
 * Splits a multi-line string on newlines and joins the lines with <br />,
 * mirroring how the original templates expected `address` / `billing`
 * strings containing literal "\n" characters to wrap onto separate lines.
 * Non-string values (already-built ReactNode, e.g. from <SupportLink />)
 * pass through unchanged.
 */
const withLineBreaks = (value: React.ReactNode): React.ReactNode => {
    if (typeof value !== 'string') return value;

    const lines = value.split('\n');
    if (lines.length === 1) return value;

    return lines.map((line, index) => (
        <React.Fragment key={index}>
            {line}
            {index < lines.length - 1 && <br />}
        </React.Fragment>
    ));
};

/**
 * Two-column label/value block used for "Shipping to:", "Billed to:", and
 * "Payment details:" rows. Mirrors the `.billing-details` table markup shared
 * by success.html and failure.html.
 */
export const BillingDetails = ({ rows }: BillingDetailsProps) => {
    return (
        <Section style={{ marginBottom: '32px' }}>
            {rows.map((row) => (
                <Row key={row.label}>
                    <Column style={{ verticalAlign: 'top', width: '40%' }}>
                        <Heading as="h3" m={16}>
                            {row.label}
                        </Heading>
                    </Column>
                    <Column style={{ verticalAlign: 'top' }}>
                        <Text style={{ margin: '16px 0' }}>{withLineBreaks(row.value)}</Text>
                    </Column>
                </Row>
            ))}
        </Section>
    );
};

export default BillingDetails;
