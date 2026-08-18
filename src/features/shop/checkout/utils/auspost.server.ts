import { createCachedLoader } from '@/utils/server/cache.server'

const AUSPOST_BASE_URL = 'https://digitalapi.auspost.com.au'
const DOMESTIC_COUNTRY_CODE = 'AU'

const DOMESTIC_STANDARD_SERVICE = 'AUS_PARCEL_REGULAR'
const INTERNATIONAL_STANDARD_SERVICE = 'INT_PARCEL_STD_OWN_PACKAGING'

type ShippingRequest = {
    country: string
    postcode: string
    totalUnitVolume: number
    totalWeightGrams: number
}

type Packaging = {
    length: number
    width: number
    height: number
}

function resolvePackaging(totalUnitVolume: number): Packaging {
    const baseLength = 24
    const baseWidth = 16
    const baseHeight = 8

    // Increase height progressively as unit volume grows.
    const heightGrowth = Math.max(0, Math.ceil(totalUnitVolume / 10) - 1) * 3

    return {
        length: baseLength,
        width: baseWidth,
        height: baseHeight + heightGrowth,
    }
}

function toCountryCode(country: string): string {
    return country.trim().toUpperCase()
}

function parseAuspostCostCents(payload: unknown): number {
    if (!payload || typeof payload !== 'object') {
        throw new Error('Unexpected AusPost response payload')
    }

    const data = payload as {
        postage_result?: {
            costs?: {
                cost?: {
                    cost?: number | string
                }
            }
        }
    }

    const maybeCost = data.postage_result?.costs?.cost?.cost
    const dollars = Number(maybeCost)

    if (!Number.isFinite(dollars) || dollars < 0) {
        throw new Error('Unable to parse shipping cost from AusPost response')
    }

    return Math.round(dollars * 100)
}

async function readAuspostError(response: Response): Promise<string | null> {
    try {
        const payload = (await response.json()) as {
            error?: { errorMessage?: unknown }
        }
        const message = payload.error?.errorMessage
        return typeof message === 'string' && message ? message : null
    } catch {
        return null
    }
}

async function fetchAuspostShippingCents({
    country,
    postcode,
    totalUnitVolume,
    totalWeightGrams,
}: ShippingRequest): Promise<number> {
    const authKey = process.env.AUSPOST_KEY
    if (!authKey) {
        throw new Error('AUSPOST_KEY is not configured')
    }

    const normalizedCountry = toCountryCode(country)
    const isDomestic = normalizedCountry === DOMESTIC_COUNTRY_CODE
    const weightKg = Math.max(totalWeightGrams, 0) / 1000

    const params = new URLSearchParams()
    if (isDomestic) {
        const originPostcode = process.env.AUSPOST_ORIGIN_POSTCODE
        if (!originPostcode) {
            throw new Error('AUSPOST_ORIGIN_POSTCODE is not configured')
        }

        if (!postcode.trim()) {
            throw new Error('Postcode is required for domestic shipping')
        }

        const packaging = resolvePackaging(totalUnitVolume)
        params.set('from_postcode', originPostcode)
        params.set('to_postcode', postcode.trim())
        params.set('length', packaging.length.toString())
        params.set('width', packaging.width.toString())
        params.set('height', packaging.height.toString())
        params.set('weight', weightKg.toString())
        params.set('service_code', DOMESTIC_STANDARD_SERVICE)
    } else {
        params.set('country_code', normalizedCountry)
        params.set('weight', weightKg.toString())
        params.set('service_code', INTERNATIONAL_STANDARD_SERVICE)
    }

    const endpoint = isDomestic
        ? '/postage/parcel/domestic/calculate'
        : '/postage/parcel/international/calculate'

    const response = await fetch(
        `${AUSPOST_BASE_URL}${endpoint}?${params.toString()}`,
        {
            method: 'GET',
            headers: {
                'auth-key': authKey,
            },
        },
    )

    if (!response.ok) {
        // AusPost answers 404 (not 400) for rejected inputs — e.g. an
        // incomplete postcode gets `{"error":{"errorMessage":"Please enter a
        // valid To postcode."}}`. Pass their wording through; a bare status
        // reads like an outage.
        throw new Error(
            (await readAuspostError(response)) ??
                `AusPost request failed with status ${response.status}`,
        )
    }

    const payload = await response.json()
    return parseAuspostCostCents(payload)
}

/**
 * Quotes are cached per destination and parcel. AusPost is metered and quoting is
 * reachable unauthenticated through `getShippingQuote`, so an uncached call meant
 * one billable request per HTTP request; postage prices move on the order of
 * months, so serving a repeat destination from memory costs nothing real.
 *
 * Keyed on the same values the request is built from — a change to any of them is
 * a different quote. Failures aren't cached (see `createCachedLoader`), which
 * keeps AusPost's own validation wording flowing through to the customer.
 */
const QUOTE_CACHE_TTL_MS = 10 * 60_000
const QUOTE_CACHE_MAX_ENTRIES = 500

const loadShippingCents = createCachedLoader(fetchAuspostShippingCents, {
    ttlMs: QUOTE_CACHE_TTL_MS,
    maxEntries: QUOTE_CACHE_MAX_ENTRIES,
    keyOf: (request) =>
        [
            toCountryCode(request.country),
            request.postcode.trim(),
            request.totalWeightGrams,
            request.totalUnitVolume,
        ].join('|'),
})

export function calculateAuspostShippingCents(
    request: ShippingRequest,
): Promise<number> {
    return loadShippingCents(request)
}
