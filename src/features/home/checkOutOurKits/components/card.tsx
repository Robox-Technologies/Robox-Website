import Card from '@/components/card'
import Button from '@/components/button'
import type React from 'react'
interface ProductCardProps {
    className?: string
    image: ImageMetadata
    price: string
    href: string
    absolute?: React.ReactNode
    title: string
}
export default function ProductCard({
    className,
    image,
    price,
    href,
    absolute,
    title,
}: ProductCardProps) {
    return (
        <Card
            className={`w-[350px] basis-[350px] relative box-shadow bg-gray-100 ${className ?? ''}`}
            absolute={absolute}
            title={<h1 className="text-2xl font-bold">{title}</h1>}
            image={
                <img
                    src={image.src}
                    alt={`Thumbnail for product ${title}`}
                    className="w-full h-auto rounded-t-lg"
                />
            }
            description={
                <p className="text-lg">
                    <span className="text-[#4aa21e]">Available for Purchase</span>
                    <br />
                    AU${price}
                </p>
            }
        >
            <div className="flex justify-center p-4">
                <Button href={href} className="bg-blue text-xl px-8 box-shadow">
                    View Product
                </Button>
            </div>
        </Card>
    )
}
