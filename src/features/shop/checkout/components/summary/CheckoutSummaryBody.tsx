import CheckoutSummaryRow from './CheckoutSummaryRow'
import { formatPrice } from '@/utils/formatPrice'

/**
 * The summary before a Checkout Session exists, from our own quote. No voucher field:
 * a code is applied against the session, which only exists on the payment step.
 */
function describeShipping({
    shippingCents,
    shippingLoading,
    shippingError,
}: {
    shippingCents: number | null
    shippingLoading: boolean
    shippingError: string | null
}): string {
    if (shippingError) return shippingError
    if (shippingLoading) return 'Calculating...'
    if (shippingCents === null) return 'Calculated at checkout'
    return formatPrice(shippingCents, true)
}

export default function CheckoutSummaryBody({
    subtotalCents,
    shippingCents,
    shippingLoading,
    shippingError,
    totalCents,
    shippingLabel,
}: {
    subtotalCents: number
    shippingCents: number | null
    shippingLoading: boolean
    shippingError: string | null
    totalCents: number
    /** The chosen service, e.g. "Express shipping", once one is priced. */
    shippingLabel?: string | null
}) {
    return (
        <div className="flex flex-1 flex-col gap-4">
            <CheckoutSummaryRow
                label="Subtotal"
                value={formatPrice(subtotalCents, true)}
            />
            <CheckoutSummaryRow
                label={shippingLabel ?? 'Shipping'}
                value={describeShipping({
                    shippingCents,
                    shippingLoading,
                    shippingError,
                })}
            />

            <div className="mt-auto">
                <hr className="mb-4 border-t border-gray-200" />
                <CheckoutSummaryRow
                    label="Total"
                    value={formatPrice(totalCents, true)}
                    emphasized
                />
            </div>
        </div>
    )
}
