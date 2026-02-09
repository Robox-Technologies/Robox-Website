import type { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";

interface ButtonProps {
    id?: string;
    className?: string;
    icon?: IconProp;
    href?: string;
    iconStyle?: string;
    onClick?: (event: React.MouseEvent<HTMLButtonElement>) => void;
    disabled?: boolean;
    children?: React.ReactNode;
    style?: React.CSSProperties;
}
export default function Button({ id, className, children , icon, href, onClick, style, iconStyle, disabled }: ButtonProps) {
    if (href) {
        return (
            <a id={id} href={href} className={` text-white rounded-2xl p-4 hover:bg-blue-dark transition ${className}`} style={style}>
                {
                    icon ? <FontAwesomeIcon icon={icon} className={iconStyle}/> : null
                }
                {children}
            </a>
        )
    }
    else {
        return (
            <button id={id} disabled={disabled} className={` text-white rounded-2xl p-4 hover:bg-blue-dark hover:cursor-pointer transition ${className}`} onClick={onClick} style={style}>
                {
                    icon ? <FontAwesomeIcon icon={icon} className={iconStyle}/> : null
                }
                {children}
            </button>
        )
    }
}