export interface Fees {
    packaging: Packaging,
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

export interface Packaging {
    excessPenalty: ExcessPenalty,
    qtyBrackets: [QuantityBracket]
}

export interface ExcessPenalty {
    cost: number,
    heightPerTen: number,
    dimensions: PackagingDimensions
}

export interface QuantityBracket {
    maxQty: number,
    cost: number,
    dimensions: PackagingDimensions
}

export interface PackagingDimensions {
    length: number,
    width: number,
    height: number
}