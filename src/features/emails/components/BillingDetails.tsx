import * as React from 'react';
import { Heading, Section, Text } from 'jsx-email';

import { billingDetailsStyle, cellHeadingStyle, cellTextStyle, topCellStyle } from '../styles';

export interface BillingRow {
    label: string;
    value: React.ReactNode;
}

export interface BillingDetailsProps {
    rows: BillingRow[];
}

/** Splits a multi-line string on newlines and joins the lines with <br />. */
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

/** Two-column label/value block for the "Shipping to:" / "Billed to:" / "Payment details:" rows. */
export const BillingDetails = ({ rows }: BillingDetailsProps) => {
    return (
        <Section style={billingDetailsStyle}>
            <table
                width="100%"
                cellPadding={0}
                cellSpacing={0}
                border={0}
                role="presentation"
                style={{ width: '100%' }}
            >
                <tbody>
                    {rows.map((row) => (
                        <tr key={row.label}>
                            <td style={topCellStyle}>
                                <Heading as="h3" style={cellHeadingStyle}>
                                    {row.label}
                                </Heading>
                            </td>
                            <td style={topCellStyle}>
                                <Text style={cellTextStyle}>{withLineBreaks(row.value)}</Text>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </Section>
    );
};

export default BillingDetails;
