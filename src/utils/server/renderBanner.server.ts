import {
    unified,
    type MarkdownRenderer,
    type RehypePlugin,
} from '@astrojs/markdown-remark'
import { safeUrl } from '@/utils/server/safeUrl'

/**
 * Renders a product banner authored as markdown in Stripe metadata. Raw HTML is off:
 * this is the one place dashboard text becomes markup, and it only ever needs bold,
 * italic and a link.
 */

/** Slow-moving content behind a build-time read; build the pipeline once. */
let renderer: MarkdownRenderer | null = null

type HastElement = {
    type: string
    properties?: Record<string, unknown>
    children?: HastElement[]
}

/**
 * Holds hrefs to the same scheme allowlist as the CMS renderer — markdown link syntax
 * survives with HTML off, and `javascript:` is still a script sink.
 */
const rehypeSafeUrls: RehypePlugin = () => (tree) => {
    const visit = (node: HastElement) => {
        if (node.type === 'element' && node.properties) {
            for (const attribute of ['href', 'src'] as const) {
                const value = node.properties[attribute]
                if (typeof value === 'string' && !safeUrl(value)) {
                    delete node.properties[attribute]
                }
            }
        }

        node.children?.forEach(visit)
    }

    visit(tree as unknown as HastElement)
}

/** Through `unified()` because `createMarkdownProcessor`'s own plugin arguments are deprecated. */
async function getRenderer(): Promise<MarkdownRenderer> {
    renderer ??= await unified({
        remarkRehype: { allowDangerousHtml: false },
        rehypePlugins: [rehypeSafeUrls],
    }).createRenderer({})

    return renderer
}

export async function renderBanner(
    banner: string | undefined,
): Promise<string> {
    if (!banner) return ''

    const { code } = await (await getRenderer()).render(banner)
    return code
}
