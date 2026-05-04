import Button from '@components/button'

export default function CartEmptyState() {
    return (
        <div className="flex flex-col items-start gap-4 py-8">
            <h2 className="mb-0! text-3xl font-bold">Your cart is empty</h2>
            <p className="mb-0 text-gray-600">
                Add some products to start building your order.
            </p>
            <Button href="/shop" className="bg-red text-white">
                Continue Shopping
            </Button>
        </div>
    )
}
