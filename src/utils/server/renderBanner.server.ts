import {
    unified,
    type MarkdownRenderer,
    type RehypePlugin,
} from '@astrojs/markdown-remark'
import { safeUrl } from '@/utils/server/safeUrl'

/**
 * Renders a product banner, authored as markdown in Stripe metadata (the
 * 10-Pack's "**Value Pack:** Save 5% off on your order!"), for the product page
 * to drop in with `set:html` — same job as the original's `storeProcessor`.
 *
 * This is the one place where text from the Stripe dashboard becomes markup, so
 * raw HTML is turned off: `allowDangerousHtml: false` makes remark-rehype drop
 * HTML nodes instead of emitting the `raw` nodes that rehype-raw would parse back
 * into real elements. Banners never need more than bold, italic and a link;
 * anything else would hand whoever can write product metadata — or whoever holds
 * a leaked secret key — stored XSS on the product page.
 */

/** Slow-moving content behind a build-time read; build the pipeline once. */
let renderer: MarkdownRenderer | null = null

type HastElement = {
    type: string
    properties?: Record<string, unknown>
    children?: HastElement[]
}

/**
 * Markdown link syntax survives with HTML off, and `[text](javascript:alert(1))`
 * is still a script sink, so hrefs are held to the same scheme allowlist the CMS
 * richtext renderer uses. Unsafe values are dropped, leaving an inert element.
 *
 * Walked by hand against a local node shape rather than with `unist-util-visit`
 * and `@types/hast`, neither of which this project depends on directly.
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

/**
 * Built through `unified()` rather than `createMarkdownProcessor`'s own
 * `remarkRehype`/`rehypePlugins` arguments: those are deprecated, and a security
 * control shouldn't sit on an option that a future major is going to drop. Both
 * paths end up in the same place — `unified().createRenderer()` forwards these
 * straight through.
 */
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
