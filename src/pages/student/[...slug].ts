export const prerender = false

import type { APIRoute } from 'astro'

/**
 * Redirects the old /student paths to the homepage. 302, since nothing has a stable new
 * home there. A real redirect, because `redirects` doesn't emit dynamic patterns.
 */

const GET: APIRoute = ({ redirect }) => redirect('/', 302)

export { GET, GET as HEAD }
