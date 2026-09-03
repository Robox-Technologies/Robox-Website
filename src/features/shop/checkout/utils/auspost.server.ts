import { createCachedLoader } from '@/utils/server/cache.server'
import type { Packaging } from '@/types/shop'
import type { Parcel } from './packaging.server'

const AUSPOST_BASE_URL = 'https://digitalapi.auspost.com.au'
const DOMESTIC_COUNTRY_CODE = 'AU'

export type ShippingServiceId = 'standard' | 'express'

export type DeliveryEstimateDays = { minimum: number; maximum: number }

export type ShippingService = {
    id: ShippingServiceId
    /** Shown to the customer when they choose. */
    label: string
    /** Australia Post's own name for it, for the parcel notes on the payment. */
    auspostName: string
    code: { domestic: string; international: string }
    /** Business days, which differ enough by scope to be worth stating. */
    estimate: {
        domestic: DeliveryEstimateDays
        international: DeliveryEstimateDays
    }
}

/**
 * What the customer can choose between. Own-packaging rates only — the satchel variants
 * require buying Australia Post's satchels, and this shop packs into its own.
 */
export const SHIPPING_SERVICES: readonly ShippingService[] = [
    {
        id: 'standard',
        label: 'Standard shipping',
        auspostName: 'Parcel Post',
        code: {
            domestic: 'AUS_PARCEL_REGULAR',
            international: 'INT_PARCEL_STD_OWN_PACKAGING',
        },
        estimate: {
            domestic: { minimum: 2, maximum: 8 },
            international: { minimum: 6, maximum: 27 },
        },
    },
    {
        id: 'express',
        label: 'Express shipping',
        auspostName: 'Express Post',
        code: {
            domestic: 'AUS_PARCEL_EXPRESS',
            international: 'INT_PARCEL_EXP_OWN_PACKAGING',
        },
        estimate: {
            domestic: { minimum: 1, maximum: 4 },
            international: { minimum: 3, maximum: 9 },
        },
    },
]

export function isDomestic(country: string): boolean {
    return toCountryCode(country) === DOMESTIC_COUNTRY_CODE
}

export function serviceCodeFor(
    service: ShippingService,
    country: string,
): string {
    return isDomestic(country)
        ? service.code.domestic
        : service.code.international
}

export function estimateFor(
    service: ShippingService,
    country: string,
): DeliveryEstimateDays {
    return isDomestic(country)
        ? service.estimate.domestic
        : service.estimate.international
}

type ShippingRequest = {
    country: string
    postcode: string
    parcel: Packaging
    totalWeightGrams: number
    serviceCode: string
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
    parcel,
    totalWeightGrams,
    serviceCode,
}: ShippingRequest): Promise<number> {
    const authKey = process.env.AUSPOST_KEY
    if (!authKey) {
        throw new Error('AUSPOST_KEY is not configured')
    }

    const normalizedCountry = toCountryCode(country)
    const domestic = isDomestic(normalizedCountry)
    const weightKg = Math.max(totalWeightGrams, 0) / 1000

    const params = new URLSearchParams()
    if (domestic) {
        const originPostcode = process.env.AUSPOST_ORIGIN_POSTCODE
        if (!originPostcode) {
            throw new Error('AUSPOST_ORIGIN_POSTCODE is not configured')
        }

        if (!postcode.trim()) {
            throw new Error('Postcode is required for domestic shipping')
        }

        params.set('from_postcode', originPostcode)
        params.set('to_postcode', postcode.trim())
        params.set('length', parcel.length.toString())
        params.set('width', parcel.width.toString())
        params.set('height', parcel.height.toString())
        params.set('weight', weightKg.toString())
        params.set('service_code', serviceCode)
    } else {
        params.set('country_code', normalizedCountry)
        params.set('weight', weightKg.toString())
        params.set('service_code', serviceCode)
    }

    const endpoint = domestic
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
        // AusPost answers 404, not 400, for rejected inputs, so pass their wording through.
        throw new Error(
            (await readAuspostError(response)) ??
                `AusPost request failed with status ${response.status}`,
        )
    }

    const payload = await response.json()
    return parseAuspostCostCents(payload)
}

/**
 * Quotes cached per destination and parcel, since AusPost is metered and reachable
 * unauthenticated through `getShippingQuote`. Failures aren't cached.
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
            request.parcel.length,
            request.parcel.width,
            request.parcel.height,
            request.serviceCode,
        ].join('|'),
})

export function calculateAuspostShippingCents(
    request: ShippingRequest,
): Promise<number> {
    return loadShippingCents(request)
}

/** Quotes every parcel in a shipment for one service. Identical parcels are quoted once. */
export async function calculateShipmentShippingCents(
    destination: { country: string; postcode: string },
    parcels: Parcel[],
    service: ShippingService,
): Promise<number> {
    const groups = new Map<string, { parcel: Parcel; count: number }>()

    for (const parcel of parcels) {
        const { length, width, height } = parcel.dimensions
        const key = `${length}x${width}x${height}|${parcel.weightGrams}`
        const existing = groups.get(key)
        if (existing) {
            existing.count += 1
            continue
        }
        groups.set(key, { parcel, count: 1 })
    }

    const serviceCode = serviceCodeFor(service, destination.country)

    const quotes = await Promise.all(
        [...groups.values()].map(async ({ parcel, count }) => {
            const cents = await calculateAuspostShippingCents({
                country: destination.country,
                postcode: destination.postcode,
                totalWeightGrams: parcel.weightGrams,
                parcel: parcel.dimensions,
                serviceCode,
            })
            return cents * count
        }),
    )

    return quotes.reduce((sum, cents) => sum + cents, 0)
}

export type ServiceQuote = {
    service: ShippingService
    auspostCents: number
}

/**
 * Quotes every service, keeping the ones Australia Post will carry. An unavailable
 * service is dropped; if nothing survives the first error is rethrown.
 */
export async function quoteShipmentServices(
    destination: { country: string; postcode: string },
    parcels: Parcel[],
): Promise<ServiceQuote[]> {
    const results = await Promise.all(
        SHIPPING_SERVICES.map(async (service) => {
            try {
                const auspostCents = await calculateShipmentShippingCents(
                    destination,
                    parcels,
                    service,
                )
                return { service, auspostCents }
            } catch (error) {
                return { service, error: error as Error }
            }
        }),
    )

    const quotes = results.filter(
        (result): result is ServiceQuote => 'auspostCents' in result,
    )

    if (quotes.length === 0) {
        const firstError = results.find(
            (result): result is { service: ShippingService; error: Error } =>
                'error' in result,
        )
        throw firstError?.error ?? new Error('No shipping services available')
    }

    // Cheapest first: Stripe pre-selects the first option it is given, and that
    // should be the one nobody has to think about.
    return quotes.sort((a, b) => a.auspostCents - b.auspostCents)
}
