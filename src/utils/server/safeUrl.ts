/**
 * Scheme allowlist for URLs that come from a content author rather than from
 * this codebase — CMS richtext (`lexicalToHtml.ts`) and the Stripe-authored
 * product banner (`renderBanner.server.ts`). Both end up inside `set:html`, so
 * an unfiltered `javascript:` href is a script sink.
 *
 * An allowlist rather than a `javascript:` denylist: that way a scheme nobody
 * thought about (`data:`, `vbscript:`, whatever a browser adds next) is rejected
 * by default instead of needing to be predicted here.
 */
export function safeUrl(url: string | null | undefined): string | null {
    if (!url) return null
    const trimmed = url.trim()
    if (/^(https?:|mailto:|tel:|\/|#)/i.test(trimmed)) return trimmed
    return null
}
