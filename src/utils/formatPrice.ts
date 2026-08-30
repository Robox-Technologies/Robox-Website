/**
 * Currencies Stripe treats as having no minor unit, so an amount of `100` is
 * 100 of the currency rather than 1.00. Kept as Stripe's list rather than
 * derived from `Intl`, because "minor units" here means whatever Stripe's API
 * accepts - the two disagree for a few currencies (ISK, for one).
 *
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
 * `Intl`'s narrow symbols collapse the whole dollar family to a bare "$" in
 * en-AU, so AUD, USD and NZD all render identically - unusable next to a
 * currency selector. Disambiguate them by hand, and keep AUD as the "AU$" the
 * site and the receipt emails have always shown.
 *
 * Only the symbol is overridden; the digits, grouping and symbol placement
 * still come from `Intl`.
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
    /**
     * Always show the currency's full precision. Off by default so a whole-unit
     * amount reads "AU$35" on a product card; on for anything in a totals
     * column, where the decimal points should line up.
     */
    forceCents?: boolean
    locale?: string
}

/**
 * Formats a Stripe minor-unit amount in the given currency.
 *
 * Amounts arriving from Stripe are always integers in the currency's smallest
 * unit, so the number of decimal places has to come from the currency rather
 * than from the value - `3550` is 35.50 AUD but 3550 JPY.
 */
export function formatMoney(
    minorUnits: number,
    currency: string,
    { forceCents = false, locale = 'en-AU' }: FormatMoneyOptions = {},
): string {
    const code = currency.toUpperCase()
    const major = minorUnits / minorUnitDivisor(currency)

    // Test the *major* value: every minor-unit amount is an integer, so asking
    // `Number.isInteger` about the raw input always said yes and rounded 35.50
    // up to "AU$36".
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

/**
 * AUD shorthand for `formatMoney`. Retained because the receipt emails and
 * every catalog surface render in the settlement currency; anything showing a
 * customer-selected currency should call `formatMoney` directly.
 */
export function formatPrice(price: number, forceCents = false): string {
    return formatMoney(price, 'aud', { forceCents })
}
