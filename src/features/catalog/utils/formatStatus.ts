import type { ProductStatus } from '@/types/shop'

export function formatStatus(status: ProductStatus): {
    text: string
    color: string
} {
    switch (status) {
        case 'available':
            return {
                text: 'Available for Purchase',
                color: 'text-[#4AA21E] text-lg',
            }
        case 'preorder':
            return {
                text: 'Coming Soon',
                color: 'text-blue text-lg',
            }
        case 'not-available':
            return {
                text: 'Not Available',
                color: 'text-[#df1b41] text-lg',
            }
    }
}
