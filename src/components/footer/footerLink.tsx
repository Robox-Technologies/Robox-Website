export default function FooterLink({
    href,
    children,
}: {
    href: string
    children: React.ReactNode
}) {
    return (
        <a
            href={href}
            className="mt-2 text-lg text-black hover:underline flex items-center gap-2"
        >
            {children}
        </a>
    )
}
