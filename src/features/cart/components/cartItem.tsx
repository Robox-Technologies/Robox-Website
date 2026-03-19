import { formatPrice } from "@utils/stripe";
import type { ImageMetadata } from "astro";
import type { Product } from "src/types/shop";
export default function CartItem({product, quantity, image, updateQuantity}: {product: Product, quantity: number, image: ImageMetadata, updateQuantity: (quantity: number) => void}) {
    return (
        <div className="flex flex-row gap-4">
            <img src={image.src} alt={product.name} className="w-24 aspect-video object-cover rounded-lg" />
            <div className="flex flex-col gap-2">
                <h3 className="text-lg font-semibold">{product.name}</h3>
                <p className="text-gray-600">{formatPrice(product.price * quantity)}</p>
                <p className="text-gray-600">{formatPrice(product.price)}/each</p>
            </div>
        </div>
    );
}