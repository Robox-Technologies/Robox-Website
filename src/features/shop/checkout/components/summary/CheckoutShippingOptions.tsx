import type {
    StripeCheckoutSession,
    StripeCheckoutUpdateShippingOptionResult,
} from '@stripe/stripe-js'
import { useState } from 'react'
import { formatMoney } from '@/utils/formatPrice'

function describeEstimate(
    estimate: StripeCheckoutSession['shippingOptions'][number]['deliveryEstimate'],
): string | null {
    const minimum = estimate?.minimum?.value
    const maximum = estimate?.maximum?.value
    if (!minimum && !maximum) return null
    if (minimum && maximum) {
        return minimum === maximum
            ? `${minimum} business days`
            : `${minimum}–${maximum} business days`
    }
    return `${minimum ?? maximum} business days`
}

/**
 * Lets the customer pick a postage service.
 *
 * Elements has no ready-made shipping selector the way the hosted page does, so
 * this renders the session's own `shippingOptions` and hands the choice back
 * with `updateShippingOption`. Stripe re-totals the session, and the summary
 * above re-renders from it - nothing here works out a total.
 *
 * Renders nothing when there is only one service, since a choice of one is not
 * a choice.
 */
export default function CheckoutShippingOptions({
    options,
    selectedId,
    currency,
    updateShippingOption,
}: {
    options: StripeCheckoutSession['shippingOptions']
    selectedId: string | null
    currency: string
    updateShippingOption: (
        id: string,
    ) => Promise<StripeCheckoutUpdateShippingOptionResult>
}) {
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState<string | null>(null)

    if (options.length < 2) return null

    const choose = async (id: string) => {
        if (busy || id === selectedId) return
        setBusy(true)
        setMessage(null)
        const result = await updateShippingOption(id)
        if (result.type === 'error') {
            setMessage(result.error.message)
        }
        setBusy(false)
    }

    return (
        <fieldset className="flex flex-col gap-2" disabled={busy}>
            <legend className="text-md mb-1 font-medium text-black">
                Delivery speed
            </legend>
            {options.map((option) => {
                const estimate = describeEstimate(option.deliveryEstimate)
                return (
                    <label
                        key={option.id}
                        className="flex cursor-pointer items-start gap-2 text-base text-gray-700"
                    >
                        <input
                            type="radio"
                            name="shippingOption"
                            value={option.id}
                            checked={option.id === selectedId}
                            onChange={() => void choose(option.id)}
                            className="mt-1.5 h-4 w-4 shrink-0"
                        />
                        <span className="flex min-w-0 flex-1 justify-between gap-3">
                            <span className="min-w-0">
                                {option.displayName}
                                {estimate && (
                                    <span className="block text-sm text-gray-600">
                                        {estimate}
                                    </span>
                                )}
                            </span>
                            <span className="shrink-0">
                                {formatMoney(
                                    option.minorUnitsAmount,
                                    currency,
                                    { forceCents: true },
                                )}
                            </span>
                        </span>
                    </label>
                )
            })}
            {message && (
                <p className="mb-0 text-sm text-red" role="status">
                    {message}
                </p>
            )}
        </fieldset>
    )
}
