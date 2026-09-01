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
 * What the customer can choose between.
 *
 * Only Australia Post's *own packaging* rates appear here. Their service list
 * also returns satchel and size-banded variants which are often cheaper, but
 * those require buying Australia Post's own satchels - this shop packs into its
 * own (see `packaging.server.ts`), so quoting a satchel rate would charge for
 * postage we don't actually buy.
 *
 * Economy Air (`INT_PARCEL_AIR_OWN_PACKAGING`) and Courier
 * (`INT_PARCEL_COR_OWN_PACKAGING`) exist internationally and would slot in
 * here; two tiers is enough to be useful without turning delivery into a
 * research task. Stripe caps a session at five.
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

/**
 * Quotes every parcel in a shipment for one service and adds them up.
 *
 * Identical parcels are quoted once and multiplied. Australia Post is metered,
 * and an order of ten identical boxes would otherwise be ten requests for one
 * answer - the per-request cache would collapse them eventually, but only after
 * they had all been issued in parallel and all missed.
 */
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
 * Quotes the shipment for every service, keeping the ones Australia Post will
 * actually carry.
 *
 * A service can be unavailable for a given destination or parcel, and that is
 * an ordinary answer rather than a failure - the customer simply isn't offered
 * it. But a bad address makes *every* service fail, and that the customer does
 * need to hear, so if nothing survives the first error is rethrown with Australia
 * Post's own wording intact.
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
