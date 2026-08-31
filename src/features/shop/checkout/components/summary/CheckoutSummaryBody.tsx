import CheckoutSummaryRow from './CheckoutSummaryRow'
import { formatPrice } from '@/utils/formatPrice'

/**
 * The summary before a Checkout Session exists - a preview of what the order
 * will cost, from our own quote.
 *
 * There is no voucher field here on purpose: a code is applied against the
 * session, which only exists on the payment step. Showing one earlier would
 * mean computing a discount ourselves, and that is exactly the disagreement
 * with Stripe's arithmetic this migration removes.
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
}: {
    subtotalCents: number
    shippingCents: number | null
    shippingLoading: boolean
    shippingError: string | null
    totalCents: number
}) {
    return (
        <div className="flex flex-1 flex-col gap-4">
            <CheckoutSummaryRow
                label="Subtotal"
                value={formatPrice(subtotalCents, true)}
            />
            <CheckoutSummaryRow
                label="Shipping"
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
