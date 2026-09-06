import * as React from 'react'
import { Heading, Section, Text } from 'jsx-email'

import {
    alignCenter,
    alignRight,
    cellHeadingStyle,
    cellStyle,
    cellTextStyle,
    discountTextStyle,
    feeRowStyle,
    purchaseContentStyle,
    purchaseTotalLabelStyle,
    purchaseTotalStyle,
    rowSeparateStyle,
    smallCellStyle,
    summaryStyle,
} from '../styles'

export interface OrderItem {
    /** Item / product name */
    name: string
    quantity: number
    /** Pre-formatted subtotal string, e.g. "AU$49.00" */
    subtotal: string
}

export interface OrderSummaryProps {
    orderId: string
    /** Pre-formatted date string, e.g. "23 June 2026" */
    date: string
    items: OrderItem[]
    /** Pre-formatted shipping cost string, e.g. "AU$9.95" */
    shipping: string
    /** Australia Post service, e.g. "Express shipping". Falls back to plain "Shipping". */
    shippingMethod?: string
    /** Pre-formatted discount amount, e.g. "AU$10.00", or undefined when none applies. */
    discount?: string
    /** Pre-formatted grand total string, e.g. "AU$58.95" */
    total: string
}

/**
 * Order summary table. Raw <table> because jsx-email's <Row>/<Column> nest a table
 * per row and don't line up column to column.
 */

/** A cell whose content is a <p>, matching the original's `createCell`. */
const Cell = ({
    children,
    align,
    style,
    textStyle,
    colSpan,
}: {
    children?: React.ReactNode
    align?: 'left' | 'center' | 'right'
    style?: React.CSSProperties
    textStyle?: React.CSSProperties
    colSpan?: number
}) => (
    <td align={align} colSpan={colSpan} style={{ ...cellStyle, ...style }}>
        <Text style={{ ...cellTextStyle, ...textStyle }}>{children}</Text>
    </td>
)

export const OrderSummary = ({
    orderId,
    date,
    items,
    shipping,
    shippingMethod,
    discount,
    total,
}: OrderSummaryProps) => {
    // The original always draws a rule directly above the total: on the
    // discount row when there is one, otherwise on the shipping row.
    const shippingRowStyle = {
        ...feeRowStyle,
        ...(discount ? {} : rowSeparateStyle),
    }

    return (
        <Section style={summaryStyle}>
            <Heading as="h3" style={cellHeadingStyle}>
                Order ID: {orderId}
            </Heading>
            <Heading as="h3" style={cellHeadingStyle}>
                Date: {date}
            </Heading>

            <table
                width="100%"
                cellPadding={0}
                cellSpacing={0}
                border={0}
                role="presentation"
                style={purchaseContentStyle}
            >
                <tbody>
                    <tr>
                        <th align="left" style={rowSeparateStyle}>
                            <Text style={cellTextStyle}>Item</Text>
                        </th>
                        <th
                            align="center"
                            style={{ ...rowSeparateStyle, ...alignCenter }}
                        >
                            <Text style={cellTextStyle}>Quantity</Text>
                        </th>
                        <th
                            align="right"
                            style={{ ...rowSeparateStyle, ...alignRight }}
                        >
                            <Text style={cellTextStyle}>Subtotal</Text>
                        </th>
                    </tr>

                    {items.map((item, index) => (
                        <tr key={`${item.name}-${index}`}>
                            <Cell>{item.name}</Cell>
                            <Cell
                                align="center"
                                style={{ ...smallCellStyle, ...alignCenter }}
                            >
                                {item.quantity}
                            </Cell>
                            <Cell
                                align="right"
                                style={{ ...smallCellStyle, ...alignRight }}
                            >
                                {item.subtotal}
                            </Cell>
                        </tr>
                    ))}

                    <tr>
                        <Cell style={shippingRowStyle}>
                            {shippingMethod ?? 'Shipping'}
                        </Cell>
                        <Cell
                            align="center"
                            style={{
                                ...smallCellStyle,
                                ...alignCenter,
                                ...shippingRowStyle,
                            }}
                        />
                        <Cell
                            align="right"
                            style={{
                                ...smallCellStyle,
                                ...alignRight,
                                ...shippingRowStyle,
                            }}
                        >
                            {shipping}
                        </Cell>
                    </tr>

                    {/* `discount-row` is load-bearing: styles.ts targets `.discount-row p` in dark mode. */}
                    {discount && (
                        <tr className="discount-row">
                            <td style={{ ...cellStyle, ...rowSeparateStyle }}>
                                <Text style={discountTextStyle}>Discount</Text>
                            </td>
                            <td
                                align="center"
                                style={{
                                    ...smallCellStyle,
                                    ...alignCenter,
                                    ...rowSeparateStyle,
                                }}
                            >
                                <Text style={discountTextStyle} />
                            </td>
                            <td
                                align="right"
                                style={{
                                    ...smallCellStyle,
                                    ...alignRight,
                                    ...rowSeparateStyle,
                                }}
                            >
                                <Text style={discountTextStyle}>
                                    ({discount})
                                </Text>
                            </td>
                        </tr>
                    )}

                    <tr>
                        <td style={{ ...cellStyle, verticalAlign: 'middle' }}>
                            <Text style={purchaseTotalLabelStyle}>Total</Text>
                        </td>
                        <td
                            style={{
                                ...smallCellStyle,
                                verticalAlign: 'middle',
                            }}
                        />
                        <td
                            align="right"
                            style={{
                                ...smallCellStyle,
                                ...alignRight,
                                verticalAlign: 'middle',
                            }}
                        >
                            <Text style={purchaseTotalStyle}>{total}</Text>
                        </td>
                    </tr>
                </tbody>
            </table>
        </Section>
    )
}

export default OrderSummary
