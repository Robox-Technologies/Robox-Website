import { useStore } from '@nanostores/react'
import { useState } from 'react'
import { voucherCode, type DiscountStatus } from '../../state/shippingStore'

/**
 * Apply commits the code to the store; the quote and the payment intent both
 * key off it, so the server re-prices and reports back whether it took. The
 * discount itself is never computed here.
 */
export default function CheckoutVoucher({
    status,
    disabled,
}: {
    status: DiscountStatus
    disabled?: boolean
}) {
    const applied = useStore(voucherCode)
    const [draft, setDraft] = useState(applied)

    const apply = () => {
        voucherCode.set(draft.trim())
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
                            apply()
                        }
                    }}
                    placeholder="Enter Voucher"
                    className="min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-4 py-3 text-base text-black outline-none placeholder:text-gray-400"
                />
                <button
                    type="button"
                    onClick={apply}
                    disabled={disabled}
                    className="rounded-lg bg-red px-5 py-3 text-base font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
                >
                    Apply
                </button>
            </div>
            {status === 'success' && (
                <p className="mb-0 text-sm text-green" role="status">
                    Discount successfully applied!
                </p>
            )}
            {status === 'stale' && (
                <p className="mb-0 text-sm text-gray-600" role="status">
                    That code is valid but doesn’t apply to anything in your
                    cart.
                </p>
            )}
            {status === 'error' && (
                <p className="mb-0 text-sm text-red" role="status">
                    Could not apply discount. Check the code and try again.
                </p>
            )}
        </div>
    )
}
