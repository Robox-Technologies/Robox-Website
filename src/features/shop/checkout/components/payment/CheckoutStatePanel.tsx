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
        <div className="w-full flex-1 text-center">
            <h2 className="my-[20.75px] text-[25px] font-medium">{heading}</h2>
            <p>{children}</p>
            <a href="/shop/cart" className="button-interactive cta-button">
                Back to Cart
            </a>
        </div>
    )
}
