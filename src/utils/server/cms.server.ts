/**
 * Payload CMS client, ported from the original's CMS.ts.
 *
 * The CMS is optional infrastructure: if it isn't running, every getter returns
 * empty and the build still succeeds with the affected sections simply empty.
 */

const CMS_URL = process.env.CMS_URL ?? 'http://localhost:3333'

export type CMSLocation =
    | 'Newsletter'
    | 'Teacher Resources'
    | 'Student Resources'

type UploadRef = string | { url?: string } | null | undefined

type RawContentItem = {
    id: string
    type: 'article' | 'resource'
    createdAt: string
    updatedAt: string
    slug?: string
    previewTitle: string
    articleTitle?: string
    author?: string
    description?: string
    callToAction?: string
    content?: unknown
    thumbnail?: UploadRef
    File?: UploadRef
    status: string
    location: CMSLocation
    favorite?: boolean
}

export type CMSItem = {
    id: string
    type: 'article' | 'resource'
    slug: string
    previewTitle: string
    articleTitle: string
    author: string
    callToAction: string
    createdAt: string
    location: CMSLocation
    favorite: boolean
    /** Absolute URL of the card thumbnail, or null when the item has none. */
    thumbnailUrl: string | null
    /** Absolute URL of the downloadable, for `resource` items. */
    fileUrl: string | null
    /** Lexical richtext, for `article` items. */
    content: unknown
}

function absolute(url: string | null | undefined): string | null {
    if (!url) return null
    return url.startsWith('http') ? url : `${CMS_URL}${url}`
}

async function getJson<T>(path: string): Promise<T | null> {
    try {
        const response = await fetch(`${CMS_URL}${path}`)
        if (!response.ok) {
            console.warn(`[cms] ${path} responded ${response.status}`)
            return null
        }
        return (await response.json()) as T
    } catch (error) {
        console.warn(
            `[cms] could not reach ${CMS_URL}${path} — is the CMS running?`,
            error instanceof Error ? error.message : error,
        )
        return null
    }
}

/**
 * At `depth=1` Payload populates upload relationships into full documents. A
 * ref left as a bare id string means the id no longer exists in `media`/`files`
 * — run `scripts/repair-cms-upload-refs.mjs` if that starts happening again.
 */
function resolveUpload(ref: UploadRef): string | null {
    if (!ref || typeof ref === 'string') return null
    return absolute(ref.url)
}

/**
 * Published content, ordered the way the original did: favourites first, then
 * newest.
 */
export async function getCMSContent(): Promise<CMSItem[]> {
    // `depth=1` is load-bearing: it's what populates the `thumbnail`/`File`
    // relationships *and* the `upload` nodes inside article richtext into full
    // documents. At depth=0 all of those are bare ids, and the article body
    // images silently render as nothing.
    const data = await getJson<{ docs: RawContentItem[] }>(
        '/api/content?pagination=false&depth=1',
    )
    if (!data) return []

    return data.docs
        .filter((item) => item.status === 'published')
        .map((item) => ({
            id: item.id,
            type: item.type,
            slug: item.slug ?? item.id,
            previewTitle: item.previewTitle,
            articleTitle: item.articleTitle ?? item.previewTitle,
            author: item.author ?? '',
            callToAction: item.callToAction || 'Read Resource',
            createdAt: item.createdAt,
            location: item.location,
            favorite: Boolean(item.favorite),
            thumbnailUrl: resolveUpload(item.thumbnail),
            fileUrl: resolveUpload(item.File),
            content: item.content ?? null,
        }))
        .sort((a, b) => {
            if (a.favorite !== b.favorite) return a.favorite ? -1 : 1
            return (
                new Date(b.createdAt).getTime() -
                new Date(a.createdAt).getTime()
            )
        })
}

/**
 * A CMS-managed short link: /api/redirect/<slug> lands on the uploaded file the
 * editors pointed the slug at, so printed URLs stay valid when the file behind
 * them is replaced.
 */
type RawRedirect = {
    slug: string
    destination: UploadRef
}

/**
 * Resolves a redirect slug to the absolute URL of its destination file, or null
 * when the slug is unknown (or the CMS is unreachable).
 */
export async function getCMSRedirect(slug: string): Promise<string | null> {
    // `depth=1` is what turns `destination` from a bare id into the file
    // document that actually carries the `url`.
    const data = await getJson<{ docs: RawRedirect[] }>(
        `/api/redirects?where[slug][equals]=${encodeURIComponent(slug)}&depth=1&limit=1`,
    )
    const redirect = data?.docs?.[0]
    if (!redirect) return null

    return resolveUpload(redirect.destination)
}

export async function getCMSContentFor(
    location: CMSLocation,
): Promise<CMSItem[]> {
    const content = await getCMSContent()
    return content.filter((item) => item.location === location)
}

/**
 * Where a card should point: articles get a generated page, resources link
 * straight at their download.
 */
export function itemHref(item: CMSItem): string | null {
    return item.type === 'article' ? `/articles/${item.slug}` : item.fileUrl
}
