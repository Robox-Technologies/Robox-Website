import type { APIRoute } from 'astro'
import { isProductionOrigin } from '@/data/seo'

/**
 * An endpoint rather than a static file in `public/`, because the `Sitemap:`
 * line has to be an absolute URL and a hardcoded one would have the dev deploy
 * pointing crawlers at production's sitemap.
 *
 * The dev host also turns the whole site away. Every page there already carries
 * `noindex` (see Meta.astro), so this is the second of two signals: whichever a
 * crawler honours, the staging copy stays out of the index and can't compete
 * with the real site for the same content.
 */
export const GET: APIRoute = ({ site }) => {
    const production = isProductionOrigin(site)

    const body = production
        ? `# Everything on the site is fair game to crawl. The handful of routes that
# shouldn't be indexed (cart, checkout, the editor, 404) say so with a
# \`noindex\` meta tag instead of being blocked here on purpose: a crawler has to
# be able to fetch a page to read that tag, so disallowing them would leave
# them eligible to show up in results with no snippet.
User-agent: *
Allow: /

Sitemap: ${new URL('/sitemap-index.xml', site).href}
`
        : `# Not the live site — see PRODUCTION_ORIGIN in src/data/seo.ts. Nothing here
# should be indexed, or it competes with robox.com.au for the same content.
User-agent: *
Disallow: /
`

    return new Response(body, {
        headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    })
}
