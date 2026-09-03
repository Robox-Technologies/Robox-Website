/**
 * Minimal Lexical -> HTML renderer for Payload richtext, covering the node types the CMS
 * actually uses. Unknown nodes render their children rather than vanishing.
 */

// Blocks `javascript:` and friends; CMS content is trusted-ish, not trusted.
import { safeUrl } from '@/utils/server/safeUrl'

/** Lexical's TextNode format bitmask. */
const FORMAT = {
    bold: 1,
    italic: 2,
    strikethrough: 4,
    underline: 8,
    code: 16,
    subscript: 32,
    superscript: 64,
} as const

type LexicalNode = {
    type?: string
    tag?: string
    text?: string
    format?: number | string
    listType?: string
    url?: string
    fields?: { url?: string; newTab?: boolean; linkType?: string }
    value?: { url?: string; alt?: string; filename?: string } | string | null
    relationTo?: string
    children?: LexicalNode[]
}

function escapeHtml(value: string): string {
    return value
        .replaceAll('&', '&amp;')
        .replaceAll('<', '&lt;')
        .replaceAll('>', '&gt;')
        .replaceAll('"', '&quot;')
        .replaceAll("'", '&#39;')
}

function renderText(node: LexicalNode): string {
    let html = escapeHtml(node.text ?? '')
    const format = typeof node.format === 'number' ? node.format : 0

    if (format & FORMAT.code) html = `<code>${html}</code>`
    if (format & FORMAT.bold) html = `<strong>${html}</strong>`
    if (format & FORMAT.italic) html = `<em>${html}</em>`
    if (format & FORMAT.underline) html = `<u>${html}</u>`
    if (format & FORMAT.strikethrough) html = `<s>${html}</s>`
    if (format & FORMAT.subscript) html = `<sub>${html}</sub>`
    if (format & FORMAT.superscript) html = `<sup>${html}</sup>`

    return html
}

function renderUpload(node: LexicalNode, cmsUrl: string): string {
    const value = node.value
    if (!value || typeof value === 'string') return ''

    const raw = value.url
    if (!raw) return ''
    const src = raw.startsWith('http') ? raw : `${cmsUrl}${raw}`

    return `<img src="${escapeHtml(src)}" alt="${escapeHtml(value.alt ?? '')}" loading="lazy" />`
}

function renderChildren(
    nodes: LexicalNode[] | undefined,
    cmsUrl: string,
): string {
    return (nodes ?? []).map((child) => renderNode(child, cmsUrl)).join('')
}

function renderNode(node: LexicalNode, cmsUrl: string): string {
    switch (node.type) {
        case 'text':
            return renderText(node)

        case 'linebreak':
            return '<br />'

        case 'horizontalrule':
            return '<hr />'

        case 'paragraph': {
            const inner = renderChildren(node.children, cmsUrl)
            return inner ? `<p>${inner}</p>` : ''
        }

        case 'heading': {
            const tag = /^h[1-6]$/.test(node.tag ?? '') ? node.tag : 'h2'
            return `<${tag}>${renderChildren(node.children, cmsUrl)}</${tag}>`
        }

        case 'list': {
            const tag = node.listType === 'number' ? 'ol' : 'ul'
            return `<${tag}>${renderChildren(node.children, cmsUrl)}</${tag}>`
        }

        case 'listitem':
            return `<li>${renderChildren(node.children, cmsUrl)}</li>`

        case 'link':
        case 'autolink': {
            const href = safeUrl(node.fields?.url ?? node.url)
            const inner = renderChildren(node.children, cmsUrl)
            if (!href) return inner
            const target = node.fields?.newTab
                ? ' target="_blank" rel="noopener noreferrer"'
                : ''
            return `<a href="${escapeHtml(href)}"${target}>${inner}</a>`
        }

        case 'upload':
            return renderUpload(node, cmsUrl)

        case 'quote':
            return `<blockquote>${renderChildren(node.children, cmsUrl)}</blockquote>`

        default:
            // Includes 'root' and anything the CMS grows later.
            return renderChildren(node.children, cmsUrl)
    }
}

export function lexicalToHtml(
    content: unknown,
    cmsUrl = process.env.CMS_URL ?? 'http://localhost:3333',
): string {
    if (!content || typeof content !== 'object') return ''
    const root = (content as { root?: LexicalNode }).root
    if (!root) return ''
    return renderChildren(root.children, cmsUrl)
}
