import Button from '@components/button'

export default function CartEmptyState() {
    return (
        <div className="flex min-h-72 flex-col items-center justify-center gap-3 text-center">
            <h2 className="mb-0! text-3xl font-bold">Your cart is empty</h2>
            <p className="mb-2 text-lg text-gray-600">
                You need more Ro/Box kits in your life ;)
            </p>
            <Button href="/shop" className="bg-red text-white">
                Continue Shopping
            </Button>
        </div>
    )
}