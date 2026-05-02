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

export async function calculateAuspostShippingCents({
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
        throw new Error(`AusPost request failed with status ${response.status}`)
    }

    const payload = await response.json()
    return parseAuspostCostCents(payload)
}
