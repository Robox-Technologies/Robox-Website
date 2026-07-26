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

type UploadDoc = {
    id: string
    url?: string
    filename?: string
    createdAt?: string
}

type UploadIndex = {
    byId: Map<string, UploadDoc>
    byCreatedSecond: Map<number, UploadDoc[]>
}

/** Seconds since epoch encoded in the leading four bytes of a Mongo ObjectId. */
function idTimestamp(id: string): number | null {
    if (!/^[0-9a-f]{24}$/i.test(id)) return null
    return parseInt(id.slice(0, 8), 16)
}

/** Lowercase alphanumerics, so "Lesson 4" matches "... Lesson 4-1.pdf". */
function normalise(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

async function getUploadIndex(
    collection: 'media' | 'files',
): Promise<UploadIndex> {
    const data = await getJson<{ docs: UploadDoc[] }>(
        `/api/${collection}?pagination=false`,
    )

    const byId = new Map<string, UploadDoc>()
    const byCreatedSecond = new Map<number, UploadDoc[]>()

    for (const doc of data?.docs ?? []) {
        byId.set(doc.id, doc)
        if (!doc.createdAt) continue
        const second = Math.floor(new Date(doc.createdAt).getTime() / 1000)
        if (!byCreatedSecond.has(second)) byCreatedSecond.set(second, [])
        byCreatedSecond.get(second)!.push(doc)
    }

    return { byId, byCreatedSecond }
}

/**
 * Recover an upload whose id no longer exists.
 *
 * The media and files documents were re-inserted at some point keeping their
 * `createdAt` but getting fresh ObjectIds, and nothing remapped the references
 * in `content` — so every `thumbnail`/`File` id 404s (on cms.robox.com.au as
 * well as locally). An ObjectId carries its creation second in its first four
 * bytes, and the re-inserted documents kept that same value in `createdAt`, so
 * the pairing is still recoverable. Where several uploads share a second, the
 * one whose filename names the item wins.
 *
 * `scripts/repair-cms-upload-refs.mjs` writes these corrections back to the
 * CMS; once that's run this never fires, because the id lookup hits first.
 */
function recoverUpload(
    ref: string,
    uploads: UploadIndex,
    title: string,
): UploadDoc | null {
    const second = idTimestamp(ref)
    if (second === null) return null

    const candidates = uploads.byCreatedSecond.get(second) ?? []
    if (candidates.length === 0) return null
    if (candidates.length === 1) return candidates[0]

    const named = candidates.filter((candidate) =>
        normalise(candidate.filename ?? '').includes(normalise(title)),
    )
    return named.length === 1 ? named[0] : null
}

function resolveUpload(
    ref: UploadRef,
    uploads: UploadIndex,
    title: string,
): string | null {
    if (!ref) return null
    // Payload hands these back as a bare id here; keep the expanded shape
    // working too, since that's what the original expected.
    if (typeof ref !== 'string') return absolute(ref.url)

    const doc = uploads.byId.get(ref) ?? recoverUpload(ref, uploads, title)
    return absolute(doc?.url)
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

    const [media, files] = await Promise.all([
        getUploadIndex('media'),
        getUploadIndex('files'),
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
            thumbnailUrl: resolveUpload(
                item.thumbnail,
                media,
                item.previewTitle,
            ),
            fileUrl: resolveUpload(item.File, files, item.previewTitle),
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
