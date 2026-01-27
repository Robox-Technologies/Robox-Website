import type { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface ButtonProps {
    className?: string;
    icon?: IconProp;
    href?: string;
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    children?: React.ReactNode;
}
export default function Button({ className, children , icon, href, onClick }: ButtonProps) {
    if (href) {
        return (
            <a href={href} className={` text-white rounded-2xl p-4 hover:bg-blue-dark transition ${className}`}>
                {
                    icon ? <FontAwesomeIcon icon={icon} className="mr-2"/> : null
                }
                {children}
            </a>
        )
    }
    else {
        return (
            <button className={` text-white rounded-2xl p-4 hover:bg-blue-dark transition ${className}`} onClick={onClick}>
                {
                    icon ? <FontAwesomeIcon icon={icon} className="mr-2"/> : null
                }
                {children}
            </button>
        )
    }
}