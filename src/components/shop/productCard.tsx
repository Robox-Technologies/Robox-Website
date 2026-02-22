import { formatPrice, formatStatus } from "@utils/stripe"
import type { ImageMetadata } from "astro"
import type { Product, ProductStatus } from "src/types/shop"

export default function ProductCard({ product, image }: { product: Product, image: ImageMetadata }) {
    const status = formatStatus(product.status);
    return (
        <div className="bg-white w-75 rounded-lg shadow-md flex flex-col hover:drop-shadow-xl transition-all duration-100">
            <img src={image.src} alt={product.name} className="w-full h-48 object-cover rounded-t-md mb-4" />
            <div className="px-4 pb-4 flex flex-col gap-2 grow">
                <h3 className="text-xl font-bold">{product.name}</h3>
                <div>
                    <p className={`text-sm font-semibold ${status.color}`}>{status.text}</p>
                    <span className="text-base">${formatPrice(product.price)}</span>
                </div>
                <button className="px-4 py-2 bg-red text-white rounded-full hover:bg-red-700 hover:cursor-pointer">View Product</button>
            </div>
        </div>
    )
}