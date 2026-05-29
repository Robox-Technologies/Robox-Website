import { faSpinner } from '@fortawesome/free-solid-svg-icons/faSpinner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

export default function CheckoutLoadingState() {
    return (
        <div className="flex min-h-72 items-center justify-center">
            <FontAwesomeIcon
                icon={faSpinner}
                spin
                className="h-8 w-8 text-black/80"
            />
        </div>
    )
}