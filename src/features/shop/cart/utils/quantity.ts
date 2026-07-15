export const CART_MIN_QUANTITY = 1
export const CART_MAX_QUANTITY = 99

export function toQuantity(value: unknown): number {
    if (typeof value === 'number') {
        return Number.isFinite(value) ? value : 0
    }

    if (typeof value === 'string') {
        const parsed = Number(value)
        return Number.isFinite(parsed) ? parsed : 0
    }

    return 0
}

export function clampQuantity(value: unknown): number {
    const quantity = Math.floor(toQuantity(value))
    return Math.min(Math.max(quantity, CART_MIN_QUANTITY), CART_MAX_QUANTITY)
}

export function incrementQuantity(value: unknown): number {
    return clampQuantity(toQuantity(value) + 1)
}

export function decrementQuantity(value: unknown): number {
    return clampQuantity(toQuantity(value) - 1)
}
