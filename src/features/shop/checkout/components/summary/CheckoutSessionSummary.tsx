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

    // Postage is a line item rather than a shipping rate (see
    // `createCheckoutSession`), so `total.shippingRate` is always zero and the
    // figure has to come off the line. The client session exposes no product
    // metadata, so unlike the server this can only match on the name - which
    // `resolveShippingProductId` keeps pinned for exactly this reason.
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

    // Every session this component sees was built with a postage line, so a
    // miss means the name drifted. It fails quietly - postage folds into the
    // subtotal and shipping reads as free, and the rows still add up to the
    // total - so it has to announce itself rather than wait to be noticed on a
    // receipt.
    if (!postageLine && checkout.lineItems.length > 0) {
        console.error(
            `[checkout-summary] no line named "${SHIPPING_LINE_ITEM_NAME}" in this session; postage is being counted as part of the subtotal`,
        )
    }

    // The line item carries only an amount, so the service name comes from the
    // option chosen a step earlier. Cosmetic - the amount beside it is the
    // session's, which is what will be charged.
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
                {/* The session's own subtotal now includes postage, since
                    postage is a line item - so the products are totalled
                    separately to keep the two rows meaning what they say. */}
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
                {/* Named rather than a bare "Shipping": the customer chose a
                    speed a step ago and seeing it here confirms the choice
                    stuck. Falls back when no rate is attached. */}
                <CheckoutSummaryRow
                    label={shippingLabel}
                    // `subtotal`, not `total`: Stripe allocates a discount
                    // across every line including postage, and showing the
                    // post-discount figure here while the Discount row also
                    // counts it left the rows not adding up to the total.
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
