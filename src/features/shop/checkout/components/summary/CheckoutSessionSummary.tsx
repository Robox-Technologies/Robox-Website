import { useCheckoutElements } from '@stripe/react-stripe-js/checkout'
import { useStore } from '@nanostores/react'
import SummaryCard from '@/components/shop/summary/SummaryCard'
import { formatMoney } from '@/utils/formatPrice'
import {
    SHIPPING_LINE_ITEM_NAME,
    isShippingLineName,
} from '../../utils/shippingLineItem'
import { shippingServiceId } from '../../state/checkoutStore'
import { shippingQuote } from '../../state/shippingStore'
import CheckoutSummaryRow from './CheckoutSummaryRow'
import CheckoutVoucher from './CheckoutVoucher'
import { SUMMARY_CARD_CLASS } from './summaryCardClass'

/**
 * The order summary once a Checkout Session exists. Every figure comes off the session,
 * but re-rendered from `minorUnitsAmount` through `formatMoney` — Stripe writes AUD as
 * "A$" where the rest of the site writes "AU$".
 */
export default function CheckoutSessionSummary() {
    const checkoutState = useCheckoutElements()
    const selectedService = useStore(shippingServiceId)
    const quote = useStore(shippingQuote)

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

    // Postage is a line item, so `total.shippingRate` is always zero. The client session
    // exposes no product metadata, so this can only match on the name.
    const postageLine = checkout.lineItems.find((line) =>
        isShippingLineName(line.name),
    )
    const productLines = checkout.lineItems.filter(
        (line) => !isShippingLineName(line.name),
    )
    const productSubtotalMinor = productLines.reduce(
        (sum, line) => sum + line.subtotal.minorUnitsAmount,
        0,
    )

    // A miss means the name drifted. It fails quietly — postage folds into the subtotal
    // and shipping reads as free — so say so loudly.
    if (!postageLine && checkout.lineItems.length > 0) {
        console.error(
            `[checkout-summary] no line named "${SHIPPING_LINE_ITEM_NAME}" in this session; postage is being counted as part of the subtotal`,
        )
    }

    // The line item carries only an amount, so the name comes from the option chosen earlier.
    const shippingLabel =
        quote?.options.find((option) => option.id === selectedService)?.label ??
        SHIPPING_LINE_ITEM_NAME
    const discountCents = total.discount.minorUnitsAmount
    const money = (amount: { minorUnitsAmount: number }) =>
        formatMoney(amount.minorUnitsAmount, checkout.currency, {
            forceCents: true,
        })

    return (
        <SummaryCard title="Order Summary" className={SUMMARY_CARD_CLASS}>
            <div className="flex flex-1 flex-col gap-4">
                {/* The session's subtotal includes postage, so total the products separately. */}
                <CheckoutSummaryRow
                    label="Subtotal"
                    value={formatMoney(
                        productSubtotalMinor,
                        checkout.currency,
                        {
                            forceCents: true,
                        },
                    )}
                />
                {/* Named rather than a bare "Shipping", so the customer sees their choice stuck. */}
                <CheckoutSummaryRow
                    label={shippingLabel}
                    // `subtotal`: Stripe allocates a discount across lines, which the
                    // Discount row already counts.
                    value={formatMoney(
                        postageLine?.subtotal.minorUnitsAmount ?? 0,
                        checkout.currency,
                        { forceCents: true },
                    )}
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
