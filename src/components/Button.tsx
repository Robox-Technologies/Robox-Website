import type { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { ButtonHTMLAttributes } from "react";


export default function Button({ className, children , icon, href, iconStyle, ...props }: {icon?: IconProp, iconStyle?: string, disabled?: boolean, href?: string} & ButtonHTMLAttributes<HTMLButtonElement> ) {
    if (href) {
        return (
            <a href={href} className={` text-white rounded-lg px-4 py-2 hover:bg-blue-dark transition ${className}`}>
                {
                    icon ? <FontAwesomeIcon icon={icon} className={iconStyle}/> : null
                }
                {children}
            </a>
        )
    }
    else {
        return (
            <button className={` text-white rounded-lg px-4 py-2 hover:bg-blue-dark hover:cursor-pointer transition ${className}`} {...props} >
                {
                    icon ? <FontAwesomeIcon icon={icon} className={iconStyle}/> : null
                }
                {children}
            </button>
        )
    }
}