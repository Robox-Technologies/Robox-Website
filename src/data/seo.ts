/**
 * Shared SEO copy and indexing rules.
 *
 * Every page passes its own `description` to the layout; `DEFAULT_DESCRIPTION`
 * is the fallback for the ones that can't have a fixed one (CMS articles with
 * nothing written in the CMS, say), and it's the line the site has always used
 * to describe itself in social previews.
 */
export const DEFAULT_DESCRIPTION =
    'Ro/Box is an ultra-affordable robotics kit that makes STEM education accessible to any student, anywhere.'

/**
 * Facebook and the Open Graph validators only show around 125 characters of a
 * description before truncating, so that's the ceiling every page writes to
 * (Google is more generous at ~160, but the shorter line reads fine in both).
 */
export const DESCRIPTION_LIMIT = 125

/**
 * Trims a longer body of copy (a Stripe product description, a CMS blurb) down
 * to something a search result or a link preview can show without cutting
 * mid-word.
 */
export function toDescription(
    text: string,
    limit = DESCRIPTION_LIMIT,
): string {
    const clean = text.replace(/\s+/g, ' ').trim()
    if (clean.length <= limit) return clean

    // Leave room for the ellipsis so the result still fits inside `limit`.
    const cut = clean.slice(0, limit - 3)
    const lastSpace = cut.lastIndexOf(' ')
    return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[,.;:]$/, '')}...`
}

/**
 * Routes that shouldn't turn up in search: they're steps in a flow, an app
 * shell, or an error page, and none of them mean anything on their own.
 *
 * One list drives both halves of that promise. Meta.astro turns these into
 * `<meta name="robots" content="noindex">` and the sitemap integration in
 * astro.config.ts leaves them out, so the tags and the sitemap can't disagree.
 */
export const NOINDEX_PATHS = [
    '/404',
    '/hub/editor',
    '/shop/cart',
    '/shop/checkout',
    '/shop/checkout/status',
]

/** Whether `pathname` is one of {@link NOINDEX_PATHS}, trailing slash or not. */
export function isNoindex(pathname: string): boolean {
    const path = pathname.replace(/\/+$/, '') || '/'
    return NOINDEX_PATHS.includes(path)
}

/**
 * The live site. Everything absolute (canonical, `og:image`, the sitemap) is
 * built off whatever `site` the build was given, so a dev deploy advertises
 * itself rather than pointing previews at production. This constant is only for
 * telling the two apart.
 */
export const PRODUCTION_ORIGIN = 'https://robox.com.au'

/**
 * Whether this build is the real site. Anything else — dev.robox.com.au, a local
 * preview — is kept out of search entirely, so a staging copy can't compete with
 * production for the same content.
 */
export function isProductionOrigin(site: URL | undefined): boolean {
    return site?.origin === PRODUCTION_ORIGIN
}
