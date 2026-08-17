export const prerender = false

import type { APIRoute } from 'astro'

/**
 * Redirects /student and /student/<anything> to the homepage.
 *
 * The student app used to live at /student; it now lives at /hub. Links to the
 * old paths are still in the wild, so they have to keep resolving.
 *
 * Temporary (302) rather than permanent: nothing has moved to a stable new home
 * at these URLs, so browsers shouldn't cache the redirect.
 *
 * This has to be a real redirect rather than a `redirects` config entry:
 * with output: 'static' those are emitted as HTML pages with a meta refresh,
 * and dynamic patterns like /student/* aren't emitted at all.
 */

const GET: APIRoute = ({ redirect }) => redirect('/', 302)

export { GET, GET as HEAD }
