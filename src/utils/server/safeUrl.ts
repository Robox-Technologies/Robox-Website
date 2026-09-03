/**
 * Scheme allowlist for author-supplied URLs (CMS richtext, the Stripe product banner),
 * both of which end up inside `set:html`. An allowlist, so unforeseen schemes are
 * rejected by default.
 */
export function safeUrl(url: string | null | undefined): string | null {
    if (!url) return null
    const trimmed = url.trim()
    if (/^(https?:|mailto:|tel:|\/|#)/i.test(trimmed)) return trimmed
    return null
}
