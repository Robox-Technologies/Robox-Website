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
            className="bg-red text-primary w-50 rounded-full! p-1.5 text-lg leading-[1.5]"
            onClick={() => setIsOpen(true)}
            {...props}
        >
            Add to Cart
        </Button>
    )
}
