type Shipping = {
    maximum: number,
    penaltyFeePerKg: number,
    weightBrackets: Array<ShippingWeightBracket>
}

type ShippingWeightBracket = {
    maxWeight: number,
    price: number
}