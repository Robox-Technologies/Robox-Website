import { twMerge } from 'tailwind-merge'

export default function CheckoutSummaryRow({
    label,
    value,
    emphasized,
}: {
    label: string
    value: string
    emphasized?: boolean
}) {
    return (
        <div
            className={twMerge(
                'flex items-center justify-between text-base text-gray-700',
                emphasized && 'pt-3 text-lg font-semibold text-black',
            )}
        >
            <span>{label}</span>
            <span>{value}</span>
        </div>
    )
}