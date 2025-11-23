export default function HeaderLink({ href, children }: { href: string; children: React.ReactNode }) {
    return (
        <a href={href} className="button-standard">
            {children}
        </a>
    );
}