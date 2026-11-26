import Button from '@/components/button'

export default function AddToCartButton(
    props: React.ButtonHTMLAttributes<HTMLButtonElement>,
) {
    return (
        <Button
            className="bg-red text-primary w-50 rounded-full! p-1.5 text-lg leading-[1.5]"
            {...props}
        >
            Add to Cart
        </Button>
    )
}
