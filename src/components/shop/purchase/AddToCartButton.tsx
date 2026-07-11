import { type Dispatch, type SetStateAction } from 'react'
import Button from '@/components/button'

export default function AddToCartButton({
    setIsOpen,
    ...props
}: {
    setIsOpen: Dispatch<SetStateAction<boolean>>
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
    return (
        <Button
            className="bg-red w-50 rounded-full! py-2 text-xl"
            onClick={() => setIsOpen(true)}
            {...props}
        >
            Add to Cart
        </Button>
    )
}
