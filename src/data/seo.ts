/** Shared SEO copy and indexing rules. */
export const DEFAULT_DESCRIPTION =
    'Ro/Box is an ultra-affordable robotics kit that makes STEM education accessible to any student, anywhere.'

/** Open Graph validators truncate past ~125 characters, so that's the ceiling. */
export const DESCRIPTION_LIMIT = 125

/** Trims longer copy to preview length without cutting mid-word. */
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
 * Routes kept out of search. Drives both the `noindex` tag in Meta.astro and the
 * sitemap filter in astro.config.ts, so the two can't disagree.
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

/** The live site, only for telling production and dev apart. Absolute URLs come from `site`. */
export const PRODUCTION_ORIGIN = 'https://robox.com.au'

/** Whether this build is the real site. Anything else is kept out of search entirely. */
export function isProductionOrigin(site: URL | undefined): boolean {
    return site?.origin === PRODUCTION_ORIGIN
}
