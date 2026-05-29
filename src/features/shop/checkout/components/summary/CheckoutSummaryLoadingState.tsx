import { faSpinner } from '@fortawesome/free-solid-svg-icons/faSpinner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import SummaryCard from '@components/shop/summary/SummaryCard'

export default function CheckoutSummaryLoadingState() {
    return (
        <SummaryCard
            title="Order Summary"
            className="w-full lg:w-96 lg:shrink-0 lg:h-full"
            emptyMessage="Add products to build your checkout summary."
        >
            <div className="flex min-h-72 items-center justify-center">
                <FontAwesomeIcon
                    icon={faSpinner}
                    spin
                    size="3x"
                    className="text-black/80"
                />
            </div>
        </SummaryCard>
    )
}