export default function HeaderLink({ icon, href, className, children }: { icon?: React.ReactNode; href: string; className?: string; children?: React.ReactNode }) {
    return (
        <a href={href} className={`button-standard hover:cursor-pointer text-black bg-inherit ${className}`}>
            {children}
        </a>
    );
}