export default function StoreLink({ className }: { className?: string }) {
    return (
        <a
            href="/shop"
            className={`button-standard button-interactive inline-flex text-white items-center gap-2 bg-red px-6 py-2 rounded-xl ${className}`}
        >
            Shop
        </a>
    )
}
