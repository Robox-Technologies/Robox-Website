/**
 * Payload CMS client, ported from the original's CMS.ts.
 *
 * The CMS is optional infrastructure: if it isn't running, every getter returns
 * empty and the build still succeeds with the affected sections simply empty —
 * same as the original, which logged "IS THE CMS RUNNING?" and carried on.
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

/** id -> absolute file url, for an upload collection. */
async function getUploadUrls(
    collection: 'media' | 'files',
): Promise<Map<string, string>> {
    const data = await getJson<{
        docs: Array<{ id: string; url?: string }>
    }>(`/api/${collection}?pagination=false`)

    const urls = new Map<string, string>()
    for (const doc of data?.docs ?? []) {
        const url = absolute(doc.url)
        if (url) urls.set(doc.id, url)
    }
    return urls
}

function resolveUpload(
    ref: UploadRef,
    urls: Map<string, string>,
): string | null {
    if (!ref) return null
    // Payload hands these back as a bare id here; keep the expanded shape
    // working too, since that's what the original expected.
    if (typeof ref === 'string') return urls.get(ref) ?? null
    return absolute(ref.url)
}

/**
 * Published content, ordered the way the original did: favourites first, then
 * newest.
 */
export async function getCMSContent(): Promise<CMSItem[]> {
    // `depth=0` is deliberate and load-bearing. At Payload's default depth the
    // `upload` nodes inside article richtext come back as `value: null`; at
    // depth=0 they carry the inline snapshot (url, alt, dimensions) that the
    // body images need. Relationship fields are bare ids either way, which is
    // why the upload collections get joined by hand below.
    const data = await getJson<{ docs: RawContentItem[] }>(
        '/api/content?pagination=false&depth=0',
    )
    if (!data) return []

    const [mediaUrls, fileUrls] = await Promise.all([
        getUploadUrls('media'),
        getUploadUrls('files'),
    ])

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
            thumbnailUrl: resolveUpload(item.thumbnail, mediaUrls),
            fileUrl: resolveUpload(item.File, fileUrls),
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
