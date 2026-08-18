import type { APIRoute } from 'astro'
import { DEFAULT_DESCRIPTION } from '@/data/seo'

/**
 * The Web App Manifest, which is what Android reads when someone adds the site
 * to their home screen — that's where `icons` below gets used.
 *
 * An endpoint rather than a static file in `public/` so the description comes
 * from the same constant as every `<meta name="description">`, instead of being
 * a second copy that quietly drifts. With `output: 'static'` this is prerendered
 * to `/site.webmanifest` at build time.
 *
 * `display: 'browser'` on purpose: the site has no service worker and isn't a
 * PWA, and the checkout flow is better off keeping the address bar visible.
 * Android still uses these icons for a home-screen shortcut either way. Switch
 * to `'standalone'` if we ever want it launching chrome-less.
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
    /**
     * Deliberately not tagged `purpose: 'maskable'`. The artwork runs the robot
     * to about 81% of the icon's width, and a maskable icon has to keep
     * everything important inside the middle 80%, so a circular mask could
     * shave the ends off its side blocks. Left as the default `any`, which lets
     * Android letterbox it instead of cropping.
     */
    icons: [
        { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
}

export const GET: APIRoute = () =>
    new Response(JSON.stringify(manifest, null, 4), {
        headers: { 'Content-Type': 'application/manifest+json' },
    })
