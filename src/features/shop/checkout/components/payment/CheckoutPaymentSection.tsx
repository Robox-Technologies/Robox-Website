import { usePaymentID } from '@/features/shop/checkout/hooks/usePaymentID'
import type { Product } from '@/types/shop'
import StripeCheckoutForm from './StripeCheckoutForm'

export default function CheckoutPaymentSection({
    products,
}: {
    products: Product[]
}) {
    const { clientSecret } = usePaymentID(products)

    return (
        <section className="flex w-full min-h-0 flex-1 flex-col gap-6 overflow-hidden lg:h-full lg:min-h-168 lg:overflow-visible">
            <StripeCheckoutForm clientSecret={clientSecret} />
        </section>
    )
}