/**
 * In-memory TTL cache for server-side reads of third-party APIs.
 *
 * The public checkout actions each read Stripe's product list, and quoting
 * shipping reads AusPost — both metered. Uncached, every unauthenticated request
 * to `/_actions/*` turned into an upstream request, so anyone could run up our
 * AusPost bill and burn our Stripe rate limit for the price of a `curl` loop.
 * Caching is half that fix; `rateLimit.server.ts` is the other half.
 *
 * In-process only: with `adapter: node({ mode: 'standalone' })` there is a single
 * server process, so a module-level Map is enough. Run more than one instance and
 * each gets its own cache (and its own rate-limit counters) — that is the point
 * at which both should move to something shared.
 */

/**
 * Set FORCE_CACHE=true to make entries never expire, for builds and offline work
 * where hitting Stripe once per process is the point.
 */
const FORCE_CACHE = process.env.FORCE_CACHE === 'true'

/** Enough for the caches here; keeps a key-varying caller from growing the Map. */
const DEFAULT_MAX_ENTRIES = 64

type Entry<T> = {
    value: T
    expiresAt: number
}

/** Oldest-first: Map iterates in insertion order. */
function evictOverflow<T>(entries: Map<string, Entry<T>>, maxEntries: number) {
    for (const key of entries.keys()) {
        if (entries.size <= maxEntries) return
        entries.delete(key)
    }
}

/**
 * Wraps an async loader so repeated calls within `ttlMs` reuse its result.
 *
 * Concurrent misses for the same key share one upstream call rather than each
 * starting their own — that matters both for a parallel build and for a burst of
 * requests arriving on a cold cache. Rejections are not cached: a failed quote
 * should be retried, and AusPost's validation messages are shown to the customer.
 */
export function createCachedLoader<Args extends unknown[], T>(
    load: (...args: Args) => Promise<T>,
    {
        ttlMs,
        keyOf,
        maxEntries = DEFAULT_MAX_ENTRIES,
    }: {
        ttlMs: number
        /** Omit for a loader that takes no arguments. */
        keyOf?: (...args: Args) => string
        maxEntries?: number
    },
): (...args: Args) => Promise<T> {
    const entries = new Map<string, Entry<T>>()
    const inFlight = new Map<string, Promise<T>>()

    return (...args: Args): Promise<T> => {
        const key = keyOf ? keyOf(...args) : ''

        const cached = entries.get(key)
        if (cached && cached.expiresAt > Date.now()) {
            return Promise.resolve(cached.value)
        }

        const pending = inFlight.get(key)
        if (pending) return pending

        const promise = load(...args)
            .then((value) => {
                entries.set(key, {
                    value,
                    expiresAt: FORCE_CACHE
                        ? Number.POSITIVE_INFINITY
                        : Date.now() + ttlMs,
                })
                evictOverflow(entries, maxEntries)
                return value
            })
            .finally(() => {
                inFlight.delete(key)
            })

        inFlight.set(key, promise)
        return promise
    }
}
