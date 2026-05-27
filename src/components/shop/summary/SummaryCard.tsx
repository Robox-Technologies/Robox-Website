import Button from '@components/button'
import { twMerge } from 'tailwind-merge'
import type { ReactNode } from 'react'

export default function SummaryCard({
    title = 'Summary',
    children,
    className,
    emptyMessage,
}: {
    title?: string
    children?: ReactNode
    className?: string
    emptyMessage?: string
}) {
    return (
        <aside
            className={twMerge(
                'flex flex-col rounded-xl border border-black/10 bg-white p-6 shadow-sm',
                className,
            )}
        >
            <h2 className="mb-4! text-2xl font-bold">{title}</h2>
            {children ? (
                <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
                    {children}
                </div>
            ) : (
                <p className="mb-0 text-gray-600">
                    {emptyMessage ?? 'Add items to see your summary.'}
                </p>
            )}
        </aside>
    )
}

export function SummaryPrimaryAction({
    href,
    children,
    disabled,
}: {
    href?: string
    children: ReactNode
    disabled?: boolean
}) {
    return (
        <Button
            href={href}
            disabled={disabled}
            className="w-full bg-blue text-center text-white! hover:bg-blue-dark disabled:cursor-not-allowed disabled:opacity-60"
        >
            {children}
        </Button>
    )
}
