/** Payload CMS client. The CMS is optional — every getter returns empty when it's unreachable. */

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
    /** Editor-written blurb, used as the article page's meta description. */
    description: string
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

/** A bare id here means the upload no longer exists — see `scripts/repair-cms-upload-refs.mjs`. */
function resolveUpload(ref: UploadRef): string | null {
    if (!ref || typeof ref === 'string') return null
    return absolute(ref.url)
}

/** Published content, favourites first then newest. */
export async function getCMSContent(): Promise<CMSItem[]> {
    // `depth=1` is load-bearing: it populates thumbnails and richtext upload nodes.
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
            description: item.description ?? '',
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

/** A CMS-managed short link, so printed URLs survive the file behind them being replaced. */
type RawRedirect = {
    slug: string
    destination: UploadRef
}

/** Resolves a redirect slug to its destination file URL, or null if unknown or unreachable. */
export async function getCMSRedirect(slug: string): Promise<string | null> {
    // `depth=1` turns `destination` from a bare id into the document carrying the `url`.
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

/** Where a card points: articles to a generated page, resources straight to the download. */
export function itemHref(item: CMSItem): string | null {
    return item.type === 'article' ? `/articles/${item.slug}` : item.fileUrl
}
