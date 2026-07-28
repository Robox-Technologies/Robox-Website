export const prerender = false

import type { APIRoute } from 'astro'

/**
 * Redirects /public/email/<file> to /email/<file>.
 *
 * The pre-Astro site kept its email images under src/pages/public/email/ and so
 * served them from /public/email/<file>. Emails sent by that site are already in
 * people's inboxes and will keep requesting the old paths for as long as they
 * are kept, so those URLs have to keep resolving after cutover.
 *
 * This has to be a real 301 rather than a `redirects` config entry: with
 * output: 'static' those are emitted as HTML pages with a meta refresh, which an
 * email client's image loader cannot follow.
 */

// Filenames only - no slashes, no traversal, nothing that could smuggle a
// newline into the Location header.
const SAFE_FILENAME = /^[A-Za-z0-9._-]+$/

const GET: APIRoute = ({ params, redirect }) => {
    const file = params.file

    if (!file || !SAFE_FILENAME.test(file)) {
        return new Response('Not found', { status: 404 })
    }

    return redirect(`/email/${file}`, 301)
}

export { GET, GET as HEAD }
