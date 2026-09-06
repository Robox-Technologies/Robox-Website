import SummaryCard from '@/components/shop/summary/SummaryCard'
import { SUMMARY_CARD_CLASS } from './summaryCardClass'

function SkeletonLine({ className = 'h-4 w-24' }: { className?: string }) {
    return (
        <div
            className={`animate-pulse rounded-full bg-black/10 ${className}`}
        />
    )
}

/** Stands in for the summary while it loads. Mirrors the real card's spacing so nothing resizes. */
export default function CheckoutSummaryLoadingState() {
    return (
        <SummaryCard title="Order Summary" className={SUMMARY_CARD_CLASS}>
            <div className="flex flex-1 flex-col gap-4">
                <div className="flex items-center justify-between text-base text-gray-700">
                    <span>Subtotal</span>
                    <SkeletonLine />
                </div>
                <div className="flex items-center justify-between text-base text-gray-700">
                    <span>Shipping</span>
                    <SkeletonLine className="h-4 w-40" />
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
