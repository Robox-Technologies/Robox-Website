import type { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface ButtonProps {
    id?: string;
    className?: string;
    icon?: IconProp;
    href?: string;
    iconColor?: string;
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    children?: React.ReactNode;
    style?: React.CSSProperties;
}
export default function Button({ id, className, children , icon, href, onClick, style, iconColor }: ButtonProps) {
    if (href) {
        return (
            <a id={id} href={href} className={` text-white rounded-2xl p-4 hover:bg-blue-dark transition ${className}`} style={style}>
                {
                    icon ? <FontAwesomeIcon icon={icon} className={iconColor}/> : null
                }
                {children}
            </a>
        )
    }
    else {
        return (
            <button id={id} className={` text-white rounded-2xl p-4 hover:bg-blue-dark hover:cursor-pointer transition ${className}`} onClick={onClick} style={style}>
                {
                    icon ? <FontAwesomeIcon icon={icon} className={iconColor}/> : null
                }
                {children}
            </button>
        )
    }
}