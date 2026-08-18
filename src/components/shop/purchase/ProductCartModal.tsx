import { useState, useRef, type Dispatch, type SetStateAction } from 'react'
import AddToCartButton from './AddToCartButton'
import Dialog, {
    DialogBody,
    DialogFooter,
    DialogHeader,
} from '@/components/dialog'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faShoppingCart } from '@fortawesome/free-solid-svg-icons'
import type { Product } from '@/types/shop'
import AddQuantity from './AddQuantity'
import { formatPrice } from '@/utils/formatPrice'
import Button from '@/components/button'
import type { ImageMetadata } from 'astro'

export default function ProductCartModal({
    product,
    image,
}: {
    product: Product
    image: ImageMetadata
}) {
    const [quantity, setQuantity] = useState(1)
    const dialogRef = useRef<HTMLDialogElement>(null)
    return (
        <Dialog
            ref={dialogRef}
            trigger={(setIsOpen) => (
                <OpenElement
                    quantity={quantity}
                    setQuantity={setQuantity}
                    setIsOpen={setIsOpen}
                    product={product}
                />
            )}
        >
            <DialogHeader className="flex-row">
                <FontAwesomeIcon
                    icon={faShoppingCart}
                    className="text-black mr-2"
                />
                <h2 className="mb-0! text-2xl! font-bold">Added to Cart</h2>
            </DialogHeader>
            {/*
              * The image is a thumbnail rather than half the dialog: at half
              * width it squeezed the text column down to a few characters per
              * line on a phone.
              */}
            <DialogBody className="flex flex-row items-center gap-4 p-4">
                <img
                    src={image.src}
                    // Decorative: the heading beside it names the product.
                    alt=""
                    className="aspect-square w-28 shrink-0 rounded-lg object-cover sm:w-40"
                />
                <div className="flex min-w-0 flex-1 flex-col items-start gap-1">
                    <h3 className="mb-0! text-xl! font-semibold sm:text-2xl!">
                        {product.name} (Qty: {quantity})
                    </h3>
                    <p className="mb-0! text-black text-xl! font-bold sm:text-2xl!">
                        {formatPrice(product.price)}/each
                    </p>
                    <p className="mb-0! text-black text-base!">
                        Total: {formatPrice(product.price * quantity)}
                    </p>
                </div>
            </DialogBody>
            <DialogFooter className="flex-row items-end gap-4">
                <Button
                    onClick={() => {
                        if (dialogRef && dialogRef.current) {
                            dialogRef.current.close()
                        }
                    }}
                    className="bg-black text-white! ml-auto"
                >
                    Continue Shopping
                </Button>
                <Button href="/shop/cart" className="bg-blue text-white">
                    View Cart
                </Button>
            </DialogFooter>
        </Dialog>
    )
}

function OpenElement({
    quantity,
    setQuantity,
    setIsOpen,
    product,
}: {
    quantity: number
    setQuantity: Dispatch<SetStateAction<number>>
    setIsOpen: Dispatch<SetStateAction<boolean>>
    product: Product
}) {
    return (
        <div className="flex flex-col gap-4">
            <AddQuantity
                quantity={quantity}
                setQuantity={setQuantity}
                data-product-id={product.internalName}
                id="add-to-cart"
            />
            <AddToCartButton
                type="submit"
                form="add-to-cart"
                setIsOpen={setIsOpen}
            />
        </div>
    )
}
