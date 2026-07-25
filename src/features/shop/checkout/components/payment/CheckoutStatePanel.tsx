import Button from '@/components/button'

/**
 * Stands in for the payment form when there's nothing to pay for, or when
 * preparing the payment intent failed. Without this the section sat on its
 * loading spinner forever, since `clientSecret` never arrives in either case.
 * Mirrors the original's `#checkout-error` block.
 */
export default function CheckoutStatePanel({
    heading,
    children,
}: {
    heading: string
    children: React.ReactNode
}) {
    return (
        <div className="flex w-full flex-1 flex-col items-start gap-4 rounded-xl border border-black/10 bg-white p-6 shadow-sm">
            <h2 className="mb-0! text-3xl font-bold">{heading}</h2>
            <p className="mb-0 text-gray-600">{children}</p>
            <Button href="/shop/cart" className="bg-red text-white">
                Back to Cart
            </Button>
        </div>
    )
}
