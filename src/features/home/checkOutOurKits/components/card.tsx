import Card from '@/components/card'
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
        // Same behaviour as the shop's own product cards: the whole card is the
        // link, and the pill inside it is a label the card drives.
        <Card
            href={href}
            className={`card-interactive w-[350px] basis-[350px] box-shadow bg-gray-100 ${className ?? ''}`}
            absolute={absolute}
            title={<h1 className="text-2xl font-bold">{title}</h1>}
            image={
                <img
                    src={image.src}
                    alt={`Thumbnail for product ${title}`}
                    className="w-full h-auto"
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
                <span className="card-cta box-shadow bg-blue text-white text-xl px-8 py-2 rounded-xl">
                    View Product
                </span>
            </div>
        </Card>
    )
}
