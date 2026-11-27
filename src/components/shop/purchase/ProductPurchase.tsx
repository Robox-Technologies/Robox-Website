import { useState } from 'react'
import AddToCartButton from './AddToCartButton'
import type { Product } from '@/types/shop'
import AddQuantity from './AddQuantity'
import { formatPrice } from '@/utils/formatPrice'

// Opens `addedToCartDialog.astro`, rendered beside this island on the product page.
export default function ProductPurchase({ product }: { product: Product }) {
    const [quantity, setQuantity] = useState(1)

    const onAdded = (added: number) => {
        const dialog = document.querySelector<HTMLDialogElement>(
            '#added-to-cart-dialog',
        )
        if (!dialog) return
        dialog.querySelector('.addedToCartQuantity')!.textContent =
            String(added)
        dialog.querySelector('.addedToCartTotal')!.textContent = formatPrice(
            product.price * added,
        )
        dialog.showModal()
    }

    return (
        <div className="flex flex-col gap-4">
            <AddQuantity
                quantity={quantity}
                setQuantity={setQuantity}
                onAdded={onAdded}
                data-product-id={product.internalName}
                id="add-to-cart"
            />
            <AddToCartButton type="submit" form="add-to-cart" />
        </div>
    )
}
