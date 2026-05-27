import { SummaryPrimaryAction } from '@components/shop/summary/SummaryCard'

export default function CartSummaryFooter() {
    return (
        <div className="mt-auto pt-6">
            <div className="flex flex-col gap-4">
                <p className="mb-0 text-sm text-gray-600">
                    Shipping calculated at checkout.
                </p>
                <p className="mb-0 text-sm text-gray-600">
                    Bulk order? Please email us at{' '}
                    <a
                        href="mailto:hello@robox.com.au"
                        className="font-semibold text-blue hover:underline"
                    >
                        hello@robox.com.au
                    </a>{' '}
                    for invoicing.
                </p>
                <SummaryPrimaryAction href="/shop/checkout">
                    Proceed to Checkout
                </SummaryPrimaryAction>
            </div>
        </div>
    )
}