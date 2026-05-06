import type { HTMLAttributes } from 'react'
import { twMerge } from 'tailwind-merge'

interface ArticleSectionProps {
    id?: string
    children: React.ReactNode
    direction: 'RTL' | 'LTR'
}

export default function ArticleSection({
    direction = 'LTR',
    children,
    className,
    ...props
}: ArticleSectionProps & HTMLAttributes<HTMLDivElement>) {
    const isRTL = direction === 'RTL'
    return (
        <section
            {...props}
            className={twMerge(
                `lg:items-start flex gap-12 justify-between items-center my-16 px-4`,
                isRTL
                    ? ' flex-col lg:flex-row-reverse'
                    : ' flex-col-reverse lg:flex-row',
                className,
            )}
        >
            {children}
        </section>
    )
}
