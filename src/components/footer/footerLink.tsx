export default function FooterLink({
    href,
    external,
    children,
}: {
    href: string
    external?: boolean
    children: React.ReactNode
}) {
    return (
        <a
            href={href}
            {...(external
                ? { target: '_blank', rel: 'noopener noreferrer' }
                : {})}
            className="mt-2 text-lg text-black hover:underline flex items-center gap-2"
        >
            {children}
        </a>
    )
}
