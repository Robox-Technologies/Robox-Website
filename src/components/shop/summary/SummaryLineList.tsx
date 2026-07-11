import { formatPrice } from '@/utils/formatPrice'
import { twMerge } from 'tailwind-merge'

export type SummaryLine = {
    id: string
    label: string
    amountCents: number
    highlighted?: boolean
}

export default function SummaryLineList({ lines }: { lines: SummaryLine[] }) {
    return (
        <div className="flex flex-col gap-2">
            {lines.map((line) => (
                <div
                    key={line.id}
                    className={twMerge(
                        'flex items-center justify-between text-base text-gray-700',
                        line.highlighted &&
                            'mt-2 border-t border-black/10 pt-3 text-lg font-semibold text-black',
                    )}
                >
                    <span>{line.label}</span>
                    <span>{formatPrice(line.amountCents, true)}</span>
                </div>
            ))}
        </div>
    )
}