import type { IconProp } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { ButtonHTMLAttributes, AnchorHTMLAttributes } from 'react'
import { twMerge } from 'tailwind-merge'

export default function Button({
    className,
    children,
    icon,
    href,
    iconStyle,
    ...props
}: {
    icon?: IconProp
    iconStyle?: string
    disabled?: boolean
    href?: string
} & ButtonHTMLAttributes<HTMLButtonElement>) {
    if (href) {
        const { disabled, ...anchorProps } =
            props as unknown as AnchorHTMLAttributes<HTMLAnchorElement> & {
                disabled?: boolean
            }
        return (
            <a
                href={href}
                // An anchor can't be `:disabled`, so carry the state as
                // `aria-disabled` — that's what the greyed-out look and the
                // click-blocking in `.button-interactive` key off.
                aria-disabled={disabled || undefined}
                tabIndex={disabled ? -1 : undefined}
                className={twMerge(
                    `button-interactive text-white px-4 py-2 rounded-xl`,
                    className,
                )}
                {...anchorProps}
            >
                {icon ? (
                    <FontAwesomeIcon icon={icon} className={iconStyle} />
                ) : null}
                {children}
            </a>
        )
    } else {
        return (
            <button
                className={twMerge(
                    `button-interactive text-white rounded-xl px-4 py-2`,
                    className,
                )}
                {...props}
            >
                {icon ? (
                    <FontAwesomeIcon icon={icon} className={iconStyle} />
                ) : null}
                {children}
            </button>
        )
    }
}
