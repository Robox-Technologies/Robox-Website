import CheckoutSummaryRow from './CheckoutSummaryRow'
import CheckoutVoucherPlaceholder from './CheckoutVoucherPlaceholder'
import type { SummaryLine } from '@components/shop/summary/SummaryLineList'
import { formatPrice } from '@utils/formatPrice'

function getLine(lines: SummaryLine[], id: string) {
    return lines.find((line) => line.id === id)
}

export default function CheckoutSummaryBody({
    lines,
}: {
    lines: SummaryLine[]
}) {
    const subtotalLine = getLine(lines, 'subtotal')
    const totalLine = getLine(lines, 'total')

    if (!subtotalLine || !totalLine) return null

    return (
        <div className="flex flex-1 flex-col gap-4">
            <div className="flex flex-col gap-2">
                <CheckoutSummaryRow
                    label="Subtotal"
                    value={formatPrice(subtotalLine.amountCents, true)}
                />
                <CheckoutSummaryRow
                    label="Shipping"
                    value="Calculated at checkout"
                />
            </div>

            <CheckoutVoucherPlaceholder />

            <div className="mt-auto border-t-2 border-black/80 pt-3">
                <CheckoutSummaryRow
                    label="Total"
                    value={formatPrice(totalLine.amountCents, true)}
                    emphasized
                />
            </div>
        </div>
    )
}