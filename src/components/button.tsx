import type { IconProp } from "@fortawesome/fontawesome-svg-core";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from "react";
import { twMerge } from "tailwind-merge";


export default function Button({ className, children , icon, href, iconStyle, ...props }: {icon?: IconProp, iconStyle?: string, disabled?: boolean, href?: string} & ButtonHTMLAttributes<HTMLButtonElement> ) {
    if (href) {
        const { disabled, ...anchorProps } = props as unknown as AnchorHTMLAttributes<HTMLAnchorElement> & { disabled?: boolean };
        return (
            <a href={href} className={twMerge(`text-white px-4 py-2 hover:bg-blue-dark transition`, className)} {...anchorProps}>
                {
                    icon ? <FontAwesomeIcon icon={icon} className={iconStyle}/> : null
                }
                {children}
            </a>
        )
    }
    else {
        return (
            <button className={twMerge(`text-white rounded-lg px-4 py-2 hover:bg-blue-dark hover:cursor-pointer transition`, className)} {...props} >
                {
                    icon ? <FontAwesomeIcon icon={icon} className={iconStyle}/> : null
                }
                {children}
            </button>
        )
    }
}