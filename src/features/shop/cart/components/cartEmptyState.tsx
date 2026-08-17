/** The original's `#empty-cart`: centred in a half-viewport block. */
export default function CartEmptyState() {
    return (
        <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
            <h2 className="my-[20.75px] text-[25px] font-medium">
                Your cart is empty
            </h2>
            <p className="mb-0">
                Add some products to start building your order.
            </p>
            <a href="/shop" className="button-interactive cta-button">
                Continue Shopping
            </a>
        </div>
    )
}
