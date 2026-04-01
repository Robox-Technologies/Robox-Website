import { type Dispatch, type SetStateAction } from 'react'
import Button from '@components/button'
export default function AddToCartButton({
    setIsOpen,
}: {
    setIsOpen: Dispatch<SetStateAction<boolean>>
}) {
    return (
        <Button
            className="bg-red w-50 rounded-full! py-2 text-xl"
            onClick={() => setIsOpen(true)}
        >
            Add to Cart
        </Button>
    )
}
