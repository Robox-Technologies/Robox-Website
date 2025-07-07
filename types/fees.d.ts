interface Fees {
    shipping: Shipping
}

interface Shipping {
    maximum: number,
    penaltyFeePerKg: number,
    weightBrackets: Array<ShippingWeightBracket>
}

interface ShippingWeightBracket {
    maxWeight: number,
    price: number
}