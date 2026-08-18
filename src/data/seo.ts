/**
 * Shared SEO copy.
 *
 * Every page passes its own `description` to the layout; this is the fallback
 * for the ones that can't have a fixed one (CMS articles with nothing written
 * in the CMS, say), and it's the line the site has always used to describe
 * itself in social previews.
 */
export const DEFAULT_DESCRIPTION =
    'Ro/Box is an ultra-affordable robotics kit that makes STEM education accessible to any student, anywhere.'

/**
 * Trims a longer body of copy (a Stripe product description, a CMS blurb) down
 * to something a search result can show without cutting mid-word. Google gives
 * a description roughly 160 characters before it truncates for you.
 */
export function toDescription(text: string, limit = 160): string {
    const clean = text.replace(/\s+/g, ' ').trim()
    if (clean.length <= limit) return clean

    const cut = clean.slice(0, limit)
    const lastSpace = cut.lastIndexOf(' ')
    return `${(lastSpace > 0 ? cut.slice(0, lastSpace) : cut).replace(/[,.;:]$/, '')}...`
}
