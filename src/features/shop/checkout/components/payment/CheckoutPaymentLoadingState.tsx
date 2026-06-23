import { faSpinner } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useMemo } from 'react'

export default function CheckoutPaymentLoadingState() {
    return useMemo(() => (
        <FontAwesomeIcon
            icon={faSpinner}
            spin
            size="4x"
            className="text-black/80"
        />
    ), [])
}