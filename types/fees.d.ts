export interface Fees {
    shipping: Shipping
}

export interface Shipping {
    maximum: number,
    penaltyFeePerKg: number,
    weightBrackets: Array<ShippingWeightBracket>
}

export interface ShippingWeightBracket {
    maxWeight: number,
    price: number
}