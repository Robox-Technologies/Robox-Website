import Card from '@/components/card'
import { formatStatus } from '@/features/catalog/utils/formatStatus'
import { formatPrice } from '@/utils/formatPrice'
import type { Product } from '@/types/shop'
import type React from 'react'

interface ProductCardProps {
    className?: string
    image: ImageMetadata
    /** The catalog entry, so the homepage shows the name and price Stripe holds. */
    product: Product
    absolute?: React.ReactNode
}
export default function ProductCard({
    className,
    image,
    product,
    absolute,
}: ProductCardProps) {
    const status = formatStatus(product.status)
    return (
        // Same behaviour as the shop's own product cards: the whole card is the
        // link, and the pill inside it is a label the card drives.
        <Card
            href={`/shop/product/${product.internalName}`}
            className={`card-interactive w-[350px] basis-[350px] box-shadow bg-gray-100 ${className ?? ''}`}
            absolute={absolute}
            title={<h1 className="text-2xl font-bold">{product.name}</h1>}
            image={
                <img
                    src={image.src}
                    // Decorative: the card title right below it is the
                    // product name, so describing it again is just noise.
                    alt=""
                    className="w-full h-auto"
                />
            }
            description={
                <p className="text-lg">
                    <span className={status.color}>{status.text}</span>
                    <br />
                    {formatPrice(product.price)}
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
