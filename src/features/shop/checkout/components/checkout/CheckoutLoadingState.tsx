import { faSpinner } from '@fortawesome/free-solid-svg-icons/faSpinner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

export default function CheckoutLoadingState() {
    return (
        <div className="flex min-h-72 items-center justify-center">
            <FontAwesomeIcon
                icon={faSpinner}
                spin
                size="4x"
                className="text-black/80"
            />
        </div>
    )
}