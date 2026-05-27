import { faSpinner } from '@fortawesome/free-solid-svg-icons/faSpinner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

export default function CheckoutLoadingState() {
    return (
        <div className="flex min-h-72 flex-col items-center justify-center gap-3 text-center">
            <FontAwesomeIcon icon={faSpinner} spin className="text-3xl text-black/80" />
            <h2 className="mb-0! text-3xl font-bold">Loading checkout...</h2>
            <p className="mb-0 text-gray-600">Preparing the payment area.</p>
        </div>
    )
}