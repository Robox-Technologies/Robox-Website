import Button from '@components/button'
import { formatPrice } from '@utils/stripe'
import { twMerge } from 'tailwind-merge'
import type { ReactNode } from 'react'

export type SummaryLine = {
    id: string
    label: string
    amountCents: number
    highlighted?: boolean
}

export default function CartSummary({
    title = 'Order Summary',
    lines,
    footer,
    className,
    emptyMessage,
}: {
    title?: string
    lines: SummaryLine[]
    footer?: ReactNode
    className?: string
    emptyMessage?: string
}) {
    if (lines.length === 0) {
        return (
            <aside
                className={twMerge(
                    'flex flex-col rounded-xl border border-black/10 bg-white p-6 shadow-sm',
                    className,
                )}
            >
                <h2 className="mb-4! text-2xl font-bold">{title}</h2>
                <p className="mb-0 text-gray-600">
                    {emptyMessage ?? 'Add items to see your order summary.'}
                </p>
            </aside>
        )
    }

    return (
        <aside
            className={twMerge(
                'flex flex-col rounded-xl border border-black/10 bg-white p-6 shadow-sm',
                className,
            )}
        >
            <h2 className="mb-4! text-2xl font-bold">{title}</h2>
            <div className="flex grow flex-col gap-2">
                {lines.map((line) => (
                    <div
                        key={line.id}
                        className={twMerge(
                            'flex items-center justify-between text-base text-gray-700',
                            line.highlighted && 'mt-2 border-t border-black/10 pt-3 text-lg font-semibold text-black',
                        )}
                    >
                        <span>{line.label}</span>
                        <span>{formatPrice(line.amountCents, true)}</span>
                    </div>
                ))}
            </div>
            {footer ? <div className="mt-auto pt-6">{footer}</div> : null}
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