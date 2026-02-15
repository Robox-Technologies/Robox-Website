const backendExecution = typeof window === 'undefined';
const domesticCountryCode = "AU";

export enum DiscountStatus {
    Success,
    Error,
    Stale,
    Unset
}


export function formatPrice(price: number, forceCents: boolean = false): string {
    return `AU$${(price / 100).toFixed(!forceCents && Number.isInteger(price) ? 0 : 2)}`;
}