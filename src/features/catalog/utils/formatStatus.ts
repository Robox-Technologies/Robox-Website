import type { ProductStatus } from '@/types/shop'

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
