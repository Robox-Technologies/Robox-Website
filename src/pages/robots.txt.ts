import type { APIRoute } from 'astro'
import { isProductionOrigin } from '@/data/seo'

/**
 * An endpoint, not a static file, because the `Sitemap:` line must be absolute and a
 * hardcoded one would point the dev deploy at production. Dev also disallows everything.
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
