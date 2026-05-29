import { faSpinner } from '@fortawesome/free-solid-svg-icons/faSpinner'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

export default function CheckoutPaymentLoadingState() {
    return (
        <section className="flex w-full min-h-0 flex-1 flex-col gap-6 overflow-hidden lg:h-full lg:min-h-168 lg:overflow-visible">
            <div className="flex min-h-72 flex-1 items-center justify-center">
                <FontAwesomeIcon
                    icon={faSpinner}
                    spin
                    size="4x"
                    className="text-black/80"
                />
            </div>
        </section>
    )
}