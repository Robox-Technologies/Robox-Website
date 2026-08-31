import { useState } from 'react'
import type {
    StripeCheckoutApplyPromotionCodeResult,
    StripeCheckoutRemovePromotionCodeResult,
} from '@stripe/stripe-js'

/**
 * Voucher entry, handed to Stripe.
 *
 * Nothing here works out what a code is worth. Apply hands the code to the
 * Checkout Session and Stripe re-prices the order; the summary above then shows
 * whatever came back. The previous version resolved coupons and computed the
 * discount by hand, which meant the figure on screen and the figure charged
 * were two separate calculations that could disagree.
 */
export default function CheckoutVoucher({
    applyPromotionCode,
    removePromotionCode,
    appliedCode,
}: {
    applyPromotionCode: (
        code: string,
    ) => Promise<StripeCheckoutApplyPromotionCodeResult>
    removePromotionCode: () => Promise<StripeCheckoutRemovePromotionCodeResult>
    appliedCode: string | null
}) {
    const [draft, setDraft] = useState('')
    const [busy, setBusy] = useState(false)
    const [message, setMessage] = useState<string | null>(null)

    const apply = async () => {
        const code = draft.trim()
        if (!code || busy) return

        setBusy(true)
        setMessage(null)
        const result = await applyPromotionCode(code)
        if (result.type === 'error') {
            setMessage(result.error.message)
        } else {
            setDraft('')
        }
        setBusy(false)
    }

    const remove = async () => {
        if (busy) return
        setBusy(true)
        setMessage(null)
        await removePromotionCode()
        setBusy(false)
    }

    if (appliedCode) {
        return (
            <div className="mt-auto flex flex-col gap-2">
                <span className="text-md font-medium text-black">
                    Voucher Code
                </span>
                <p className="mb-0 flex items-center justify-between gap-3 text-sm">
                    <span className="text-green">{appliedCode} applied</span>
                    <button
                        type="button"
                        onClick={() => void remove()}
                        disabled={busy}
                        className="underline"
                    >
                        Remove
                    </button>
                </p>
            </div>
        )
    }

    return (
        <div className="mt-auto flex flex-col gap-3">
            <label
                htmlFor="voucher-code"
                className="text-md font-medium text-black"
            >
                Voucher Code
            </label>
            <div className="flex gap-3">
                <input
                    id="voucher-code"
                    type="text"
                    value={draft}
                    onChange={(event) => setDraft(event.currentTarget.value)}
                    onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                            event.preventDefault()
                            void apply()
                        }
                    }}
                    placeholder="Enter Voucher"
                    className="min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-4 py-3 text-base text-black outline-none placeholder:text-gray-400"
                />
                <button
                    type="button"
                    onClick={() => void apply()}
                    disabled={busy || !draft.trim()}
                    className="button-interactive rounded-lg bg-red px-5 py-3 text-base font-semibold text-white disabled:bg-tone3"
                >
                    Apply
                </button>
            </div>
            {message && (
                <p className="mb-0 text-sm text-red" role="status">
                    {message}
                </p>
            )}
        </div>
    )
}
