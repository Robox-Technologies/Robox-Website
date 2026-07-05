import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useMemo } from 'react'

export default function CheckoutPaymentLoadingState() {
    return useMemo(() => (
        <div className="absolute inset-0 flex items-center justify-center">
            <FontAwesomeIcon
                icon={faSpinner}
                spin
                size="4x"
                className="text-black/80"
            />
        </div>
    ), [])
}