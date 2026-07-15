import { faCartShopping } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
export default function StoreLink({ className }: { className?: string }) {
    return (
        <a
            href="/shop"
            className={`button-standard inline-flex text-white items-center gap-2 bg-red px-6 py-2 rounded-xl ${className}`}
        >
            {/* <FontAwesomeIcon icon={faCartShopping} className="h-4 w-4" /> */}
            Shop
        </a>
    )
}
