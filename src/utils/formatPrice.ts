/**
 * Currencies Stripe treats as having no minor unit. Stripe's own list, not `Intl`'s —
 * they disagree for a few, ISK among them.
 * @see https://docs.stripe.com/currencies#zero-decimal
 */
const ZERO_DECIMAL_CURRENCIES = new Set([
    'bif',
    'clp',
    'djf',
    'gnf',
    'jpy',
    'kmf',
    'krw',
    'mga',
    'pyg',
    'rwf',
    'ugx',
    'vnd',
    'vuv',
    'xaf',
    'xof',
    'xpf',
])

/** Currencies Stripe bills in thousandths. @see https://docs.stripe.com/currencies#three-decimal */
const THREE_DECIMAL_CURRENCIES = new Set(['bhd', 'jod', 'kwd', 'omr', 'tnd'])

/**
 * `Intl`'s narrow symbols collapse the dollar family to a bare "$" in en-AU, so the
 * symbols are overridden by hand. Digits, grouping and placement still come from `Intl`.
 */
const SYMBOL_OVERRIDES: Record<string, string> = {
    AUD: 'AU$',
    USD: 'US$',
    NZD: 'NZ$',
    CAD: 'CA$',
    SGD: 'S$',
    HKD: 'HK$',
}

function decimalPlaces(currency: string): number {
    const code = currency.toLowerCase()
    if (ZERO_DECIMAL_CURRENCIES.has(code)) return 0
    if (THREE_DECIMAL_CURRENCIES.has(code)) return 3
    return 2
}

/** Minor units per major unit - 100 for AUD, 1 for JPY, 1000 for KWD. */
export function minorUnitDivisor(currency: string): number {
    return 10 ** decimalPlaces(currency)
}

export type FormatMoneyOptions = {
    /** Always show full precision. Off by default so a product card reads "AU$35". */
    forceCents?: boolean
    locale?: string
}

/** Formats a Stripe minor-unit amount. `3550` is 35.50 AUD but 3550 JPY, so precision comes from the currency. */
export function formatMoney(
    minorUnits: number,
    currency: string,
    { forceCents = false, locale = 'en-AU' }: FormatMoneyOptions = {},
): string {
    const code = currency.toUpperCase()
    const major = minorUnits / minorUnitDivisor(currency)

    // The major value, since every minor-unit amount is trivially an integer.
    const fractionDigits =
        !forceCents && Number.isInteger(major) ? 0 : decimalPlaces(currency)

    let parts: Intl.NumberFormatPart[]
    try {
        parts = new Intl.NumberFormat(locale, {
            style: 'currency',
            currency: code,
            currencyDisplay: 'narrowSymbol',
            minimumFractionDigits: fractionDigits,
            maximumFractionDigits: fractionDigits,
        }).formatToParts(major)
    } catch {
        // `Intl` throws a RangeError on a currency code it doesn't know. A
        // price is not worth a blank page, so fall back to the bare code.
        return `${code} ${major.toFixed(fractionDigits)}`
    }

    return parts
        .map((part) =>
            part.type === 'currency'
                ? (SYMBOL_OVERRIDES[code] ?? part.value)
                : part.value,
        )
        .join('')
}

/** AUD shorthand for `formatMoney`. Anything in a customer-selected currency should call that directly. */
export function formatPrice(price: number, forceCents = false): string {
    return formatMoney(price, 'aud', { forceCents })
}
