export const prerender = false

import type { APIRoute } from 'astro'

/**
 * Redirects /public/email/<file> to /email/<file>, for images in emails the pre-Astro
 * site already sent. A real 301, since `redirects` emits a meta refresh no image loader follows.
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
