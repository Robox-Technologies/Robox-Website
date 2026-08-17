import SummaryCard from '@/components/shop/summary/SummaryCard'

function SkeletonLine({ className = 'h-4 w-24' }: { className?: string }) {
    return (
        <div className={`animate-pulse rounded-full bg-black/10 ${className}`} />
    )
}

/**
 * The `client:only` fallback for `CheckoutSummaryCard`. It has to mirror that
 * card's wrapper classes and inner structure — same card width, same row
 * spacing, same voucher block — or the summary shifts and resizes the moment
 * hydration swaps one for the other.
 */
export default function CheckoutSummaryLoadingState() {
    return (
        <SummaryCard
            title="Order Summary"
            className="w-full min-[900px]:w-96 min-[900px]:shrink-0"
            emptyMessage="Add products to build your checkout summary."
        >
            <div className="flex flex-1 flex-col gap-4">
                <div className="flex items-center justify-between text-base text-gray-700">
                    <span>Subtotal</span>
                    <SkeletonLine />
                </div>
                <div className="flex items-center justify-between text-base text-gray-700">
                    <span>Shipping</span>
                    <SkeletonLine className="h-4 w-40" />
                </div>

                {/* Matches CheckoutVoucher's layout, inert. */}
                <div className="mt-auto flex flex-col gap-3">
                    <span className="text-md font-medium text-black">
                        Voucher Code
                    </span>
                    <div className="flex gap-3">
                        <div className="min-w-0 flex-1 rounded-lg border border-black/10 bg-white px-4 py-3 text-base text-gray-400 outline-none">
                            Enter Voucher
                        </div>
                        <button
                            type="button"
                            className="button-interactive rounded-lg bg-red px-5 py-3 text-base font-semibold text-white"
                            disabled
                        >
                            Apply
                        </button>
                    </div>
                </div>

                <div className="mt-auto">
                    <hr className="mb-4 border-t border-gray-200" />
                    <div className="flex items-center justify-between text-lg font-semibold text-black">
                        <span>Total</span>
                        <SkeletonLine className="h-5 w-28" />
                    </div>
                </div>
            </div>
        </SummaryCard>
    )
}
