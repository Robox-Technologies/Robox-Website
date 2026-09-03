import { Heading, Section, Text } from 'jsx-email'

import {
    alignRight,
    cellHeadingStyle,
    cellStyle,
    cellTextStyle,
    purchaseContentStyle,
    rowSeparateStyle,
    smallCellStyle,
    summaryStyle,
} from '../styles'

/** One parcel, with every figure already formatted for display. */
export interface ParcelLine {
    /** What to reach for, e.g. "large satchel". */
    label: string
    /** What goes inside, e.g. "10x Ro/Box Kit". */
    contents: string
    /** e.g. "48.5x36x5cm". */
    dimensions: string
    /** e.g. "2000g". */
    weight: string
}

export interface PackingSummary {
    /** Readable summary of the whole shipment, e.g. "2 large satchels, 1 box". */
    description: string
    parcels: ParcelLine[]
    /** Pre-formatted total weight, e.g. "2200g", when one was recorded. */
    totalWeight?: string
    /** Parcels beyond the ones listed, because Stripe's metadata could not hold them all. */
    unlistedParcels: number
}

export interface PackingListProps {
    /** Null for an order with no recorded packing plan. */
    packing: PackingSummary | null
}

/**
 * What to physically put in the post, one row per parcel. Internal only.
 * Raw <table> because jsx-email's <Row>/<Column> nest a table per row and don't align.
 */
export const PackingList = ({ packing }: PackingListProps) => {
    if (!packing || packing.parcels.length === 0) {
        return (
            <Section style={summaryStyle}>
                <Heading as="h2" style={cellHeadingStyle}>
                    Packaging
                </Heading>
                <Text style={cellTextStyle}>
                    {packing?.description
                        ? `${packing.description} - no parcel breakdown was recorded for this order.`
                        : 'No packing plan was recorded for this order. Pack it by hand from the items above.'}
                </Text>
            </Section>
        )
    }

    return (
        <Section style={summaryStyle}>
            <Heading as="h2" style={cellHeadingStyle}>
                Packaging: {packing.description}
            </Heading>
            {packing.totalWeight && (
                <Heading as="h3" style={cellHeadingStyle}>
                    Total weight: {packing.totalWeight}
                </Heading>
            )}

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
                            <Text style={cellTextStyle}>Parcel</Text>
                        </th>
                        <th align="left" style={rowSeparateStyle}>
                            <Text style={cellTextStyle}>Contents</Text>
                        </th>
                        <th
                            align="right"
                            style={{ ...rowSeparateStyle, ...alignRight }}
                        >
                            <Text style={cellTextStyle}>Size</Text>
                        </th>
                        <th
                            align="right"
                            style={{ ...rowSeparateStyle, ...alignRight }}
                        >
                            <Text style={cellTextStyle}>Weight</Text>
                        </th>
                    </tr>

                    {packing.parcels.map((parcel, index) => (
                        <tr key={index}>
                            <td style={cellStyle}>
                                <Text style={cellTextStyle}>
                                    {index + 1}. {parcel.label}
                                </Text>
                            </td>
                            <td style={cellStyle}>
                                <Text style={cellTextStyle}>
                                    {parcel.contents}
                                </Text>
                            </td>
                            <td
                                align="right"
                                style={{ ...smallCellStyle, ...alignRight }}
                            >
                                <Text style={cellTextStyle}>
                                    {parcel.dimensions}
                                </Text>
                            </td>
                            <td
                                align="right"
                                style={{ ...smallCellStyle, ...alignRight }}
                            >
                                <Text style={cellTextStyle}>
                                    {parcel.weight}
                                </Text>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            {/*
              Stripe caps how many parcel lines the order's metadata can hold,
              so a freak order can have more parcels than are listed above. Said
              out loud rather than silently short, which would read as a
              complete packing list.
            */}
            {packing.unlistedParcels > 0 && (
                <Text style={cellTextStyle}>
                    + {packing.unlistedParcels} further parcel
                    {packing.unlistedParcels === 1 ? '' : 's'} not listed - see
                    the payment in Stripe for the full plan.
                </Text>
            )}
        </Section>
    )
}

export default PackingList
