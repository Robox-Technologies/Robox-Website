import CheckoutSummaryRow from './CheckoutSummaryRow'
import CheckoutVoucher from './CheckoutVoucher'
import type { SummaryLine } from '@/components/shop/summary/SummaryLineList'
import { formatPrice } from '@/utils/formatPrice'

function getLine(lines: SummaryLine[], id: string) {
    return lines.find((line) => line.id === id)
}

export default function CheckoutSummaryBody({
    lines,
    shippingCents,
    shippingLoading,
    shippingError,
}: {
    lines: SummaryLine[]
    shippingCents: number | null
    shippingLoading: boolean
    shippingError: string | null
}) {
    const subtotalLine = getLine(lines, 'subtotal')
    const totalLine = getLine(lines, 'total')

    if (!subtotalLine || !totalLine) return null

    return (
        <div className="flex flex-1 flex-col gap-4">
            <CheckoutSummaryRow
                label="Subtotal"
                value={formatPrice(subtotalLine.amountCents, true)}
            />
            <CheckoutSummaryRow
                label="Shipping"
                value={
                    shippingError
                        ? shippingError
                        : shippingLoading
                            ? 'Calculating...'
                            : shippingCents !== null
                                ? formatPrice(shippingCents, true)
                                : 'Calculated at checkout'
                }
            />

            <CheckoutVoucher />

            <div className="mt-auto">
                <hr className="mb-4 border-t border-gray-200" />
                <CheckoutSummaryRow
                    label="Total"
                    value={formatPrice(totalLine.amountCents, true)}
                    emphasized
                />
            </div>
        </div>
    )
}