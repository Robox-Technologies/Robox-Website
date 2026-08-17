import type { HTMLAttributes } from 'react'
import { twMerge } from 'tailwind-merge'

export default function Article({
    children,
    className,
    ...props
}: { children: React.ReactNode } & HTMLAttributes<HTMLElement>) {
    return (
        // twMerge so a caller's padding actually replaces the default rather
        // than racing it in the stylesheet.
        <article className={twMerge('p-8', className)} {...props}>
            {children}
        </article>
    )
}
