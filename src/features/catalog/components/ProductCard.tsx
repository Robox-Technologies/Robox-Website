import { formatPrice } from '@/utils/formatPrice'
import Card from '@/components/card'
import { formatStatus } from '@/features/catalog/utils/formatStatus'
import type { ImageMetadata } from 'astro'
import type { Product } from '@/types/shop'

export default function ProductCard({
    product,
    image,
}: {
    product: Product
    image: ImageMetadata
}) {
    const status = formatStatus(product.status)
    return (
        <Card
            href={`/shop/product/${product.internalName}`}
            className="card-interactive bg-white w-75 box-shadow flex flex-col"
            title={<h1 className="text-2xl font-bold">{product.name}</h1>}
            image={
                <img
                    src={image.src}
                    alt={`Thumbnail for product ${product.name}`}
                    className="w-full h-auto"
                />
            }
            description={
                <p className="text-lg">
                    <span className={`${status.color}`}>{status.text}</span>
                    <br />
                    {formatPrice(product.price)}
                </p>
            }
        >
            <div className="flex justify-center px-4">
                {/* A <span>, not a <button>: the card is the link, and nesting a
                    control inside it would both be invalid markup and shrink the
                    tappable area back to this pill. */}
                <span className="card-cta px-4 py-2 bg-red text-white text-center w-full rounded-full">
                    View Product
                </span>
            </div>
        </Card>
    )
}
