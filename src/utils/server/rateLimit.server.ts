import { ActionError, type ActionAPIContext } from 'astro:actions'

/**
 * Fixed-window rate limiting for the checkout actions.
 *
 * Every action under `src/actions` is reachable unauthenticated at
 * `/_actions/<name>`, and each one does upstream work on metered APIs (Stripe,
 * and AusPost for anything that quotes shipping). The limits here are set well
 * above what a customer working through the checkout produces — the address is
 * only quoted once Stripe reports it `complete`, not per keystroke — so they
 * bite on scripted abuse rather than on real use.
 *
 * In-process, same as `cache.server.ts`: one standalone Node server, one set of
 * counters. A second instance would double every limit.
 */

const DEFAULT_WINDOW_MS = 60_000

/**
 * Ceiling on tracked clients, so the Map can't be grown without bound by traffic
 * that arrives from many addresses.
 */
const MAX_TRACKED_CLIENTS = 5_000

type Window = {
    count: number
    resetAt: number
}

const windows = new Map<string, Window>()

export type RateLimitRule = {
    /** Namespaces the counter, so one action can't spend another's budget. */
    name: string
    /** Requests allowed per window, per client. */
    max: number
    windowMs?: number
}

/** Drops expired windows first, then the oldest, until back under the ceiling. */
function prune() {
    if (windows.size <= MAX_TRACKED_CLIENTS) return

    const now = Date.now()
    for (const [key, window] of windows) {
        if (window.resetAt <= now) windows.delete(key)
    }

    for (const key of windows.keys()) {
        if (windows.size <= MAX_TRACKED_CLIENTS) return
        windows.delete(key)
    }
}

function consume(
    key: string,
    rule: RateLimitRule,
): { allowed: boolean; retryAfterSeconds: number } {
    const now = Date.now()
    let window = windows.get(key)

    if (!window || window.resetAt <= now) {
        // Re-inserted rather than mutated so Map order stays youngest-last, which
        // is what makes `prune`'s oldest-first pass meaningful.
        windows.delete(key)
        window = {
            count: 0,
            resetAt: now + (rule.windowMs ?? DEFAULT_WINDOW_MS),
        }
        windows.set(key, window)
        prune()
    }

    window.count += 1

    // Counted first, compared once: a request opening a fresh window is still
    // held to `max`, so a rule of 0 denies rather than letting the first through.
    if (window.count > rule.max) {
        return {
            allowed: false,
            retryAfterSeconds: Math.max(
                1,
                Math.ceil((window.resetAt - now) / 1000),
            ),
        }
    }

    return { allowed: true, retryAfterSeconds: 0 }
}

/**
 * Who to count a request against.
 *
 * `clientAddress` is the socket peer unless the request arrived with
 * `x-forwarded-for`, which Astro only trusts once the request's host matches
 * `security.allowedDomains` (see astro.config.ts). Behind a proxy that passes an
 * inbound XFF through instead of overwriting it, a caller can rotate that header
 * for a fresh bucket — so the proxy has to set it, which is the same assumption
 * the framework already makes.
 */
function clientKey(context: ActionAPIContext): string {
    try {
        return context.clientAddress || 'unknown'
    } catch {
        // Thrown when the adapter can't determine an address at all; everyone in
        // that state shares one bucket rather than skipping the limit.
        return 'unknown'
    }
}

/** Throws a 429 `ActionError` once a client is over `rule` for this window. */
export function enforceRateLimit(
    context: ActionAPIContext,
    rule: RateLimitRule,
): void {
    const { allowed, retryAfterSeconds } = consume(
        `${rule.name}:${clientKey(context)}`,
        rule,
    )

    if (allowed) return

    throw new ActionError({
        code: 'TOO_MANY_REQUESTS',
        message: `Too many checkout requests. Try again in ${retryAfterSeconds} second${retryAfterSeconds === 1 ? '' : 's'}.`,
    })
}
