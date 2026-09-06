import type { APIRoute } from 'astro'
import { DEFAULT_DESCRIPTION } from '@/data/seo'

/**
 * The Web App Manifest Android reads for a home-screen shortcut. An endpoint so the
 * description comes from the same constant as the meta tags. `display: 'browser'`
 * because this isn't a PWA and the checkout wants the address bar.
 */
const manifest = {
    id: '/',
    name: 'Ro/Box',
    short_name: 'Ro/Box',
    description: DEFAULT_DESCRIPTION,
    lang: 'en-AU',
    start_url: '/',
    scope: '/',
    display: 'browser',
    // Matches `<meta name="theme-color">` and the page background.
    background_color: '#f8f8f8',
    theme_color: '#f8f8f8',
    /** Not `maskable`: the robot runs to ~81% of the width, past the middle 80% a mask keeps. */
    icons: [
        { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
}

export const GET: APIRoute = () =>
    new Response(JSON.stringify(manifest, null, 4), {
        headers: { 'Content-Type': 'application/manifest+json' },
    })
