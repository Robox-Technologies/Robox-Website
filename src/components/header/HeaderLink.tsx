import type { IconDefinition } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
interface HeaderLinkProps {
    icon?: IconDefinition;
    href: string;
    className?: string;
    children?: React.ReactNode;
}
export default function HeaderLink({ icon, href, className, children }: HeaderLinkProps) {
    return (
        <a
            href={href}
            className={`button-standard inline-flex items-center gap-2 ${className}`}
        >
            {icon && <FontAwesomeIcon icon={icon} className="h-4 w-4" />}
            {children}
        </a>
    );
}