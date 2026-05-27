export default function StripeCheckoutPlaceholder() {
    return (
        <section className="flex min-h-full flex-col gap-6">
            <p className="mb-0 text-gray-600">
                Stripe payment UI will be mounted here.
            </p>

            <div className="flex min-h-80 flex-1 items-center justify-center rounded-xl border border-dashed border-black/20 bg-gray-50 p-6 text-center">
                <div className="max-w-md">
                    <p className="mb-2 text-lg font-semibold text-black">
                        Payment form placeholder
                    </p>
                    <p className="mb-0 text-sm text-gray-600">
                        This space is reserved for the Stripe checkout object.
                        No backend wiring is added yet.
                    </p>
                </div>
            </div>
        </section>
    )
}