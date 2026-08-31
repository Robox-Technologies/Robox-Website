import { useCheckoutElements } from '@stripe/react-stripe-js/checkout'
import SummaryCard from '@/components/shop/summary/SummaryCard'
import { formatMoney } from '@/utils/formatPrice'
import CheckoutSummaryRow from './CheckoutSummaryRow'
import CheckoutVoucher from './CheckoutVoucher'
import { SUMMARY_CARD_CLASS } from './summaryCardClass'

/**
 * The order summary once a Checkout Session exists.
 *
 * Every figure is read straight off the session rather than recomputed here.
 * Stripe owns the arithmetic from this point - discounts especially, where a
 * locally computed number would disagree with what is actually charged.
 *
 * The amounts are re-rendered from `minorUnitsAmount` through our own
 * formatter rather than using the session's preformatted `amount` strings.
 * Stripe writes AUD as "A$", and the rest of the site and the receipt emails
 * have always written "AU$" - taking Stripe's string made the total change
 * appearance between the address step and this one. `formatMoney` is driven by
 * `checkout.currency`, so this still follows the session into any presentment
 * currency. (The session also exposes `minorUnitsAmountDivisor` if the two ever
 * need cross-checking.)
 */
export default function CheckoutSessionSummary() {
    const checkoutState = useCheckoutElements()

    if (checkoutState.type !== 'success') {
        return (
            <SummaryCard title="Order Summary" className={SUMMARY_CARD_CLASS}>
                <div className="flex flex-1 flex-col gap-4">
                    <CheckoutSummaryRow label="Subtotal" value="..." />
                </div>
            </SummaryCard>
        )
    }

    const { checkout } = checkoutState
    const { total } = checkout
    const discountCents = total.discount.minorUnitsAmount
    const money = (amount: { minorUnitsAmount: number }) =>
        formatMoney(amount.minorUnitsAmount, checkout.currency, {
            forceCents: true,
        })

    return (
        <SummaryCard title="Order Summary" className={SUMMARY_CARD_CLASS}>
            <div className="flex flex-1 flex-col gap-4">
                <CheckoutSummaryRow
                    label="Subtotal"
                    value={money(total.subtotal)}
                />
                <CheckoutSummaryRow
                    label="Shipping"
                    value={money(total.shippingRate)}
                />

                {discountCents > 0 && (
                    <CheckoutSummaryRow
                        label="Discount"
                        value={`-${money(total.discount)}`}
                    />
                )}

                <CheckoutVoucher
                    applyPromotionCode={checkout.applyPromotionCode}
                    removePromotionCode={checkout.removePromotionCode}
                    appliedCode={
                        checkout.discountAmounts?.[0]?.promotionCode ?? null
                    }
                />

                <div className="mt-auto">
                    <hr className="mb-4 border-t border-gray-200" />
                    <CheckoutSummaryRow
                        label="Total"
                        value={money(total.total)}
                        emphasized
                    />
                </div>
            </div>
        </SummaryCard>
    )
}
