import type { ProductStatus } from '@/types/shop'

const backendExecution = typeof window === 'undefined'
const domesticCountryCode = 'AU'

export enum DiscountStatus {
    Success,
    Error,
    Stale,
    Unset,
}

export function formatPrice(
    price: number,
    forceCents: boolean = false,
): string {
    return `AU$${(price / 100).toFixed(!forceCents && Number.isInteger(price) ? 0 : 2)}`
}
export function formatStatus(status: ProductStatus): {
    text: string
    color: string
} {
    switch (status) {
        case 'available':
            return {
                text: 'Available for Purchase',
                color: 'text-green-500 text-xl',
            }
        case 'preorder':
            return {
                text: 'Coming Soon',
                color: 'text-yellow-500 text-xl',
            }
        case 'not-available':
            return {
                text: 'Not Available',
                color: 'text-red-500 text-xl',
            }
    }
}
