/**
 * In-memory TTL cache for reads of metered third-party APIs, so an unauthenticated
 * `/_actions/*` request can't turn into an upstream one. Half the fix; the other half is
 * `rateLimit.server.ts`. In-process only — a second instance gets its own cache.
 */

/** FORCE_CACHE=true makes entries never expire, for builds and offline work. */
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
 * Wraps an async loader so calls within `ttlMs` reuse its result. Concurrent misses share
 * one upstream call. Rejections aren't cached.
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
