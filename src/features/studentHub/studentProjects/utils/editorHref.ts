/**
 * URL of the editor for a project.
 *
 * The hub lives at `/hub` on the web but at the root in the iOS build,
 * where `transformIOSBuild()` copies `/hub`'s contents up a level — so the
 * path is derived from wherever the hub is currently being served rather than
 * hardcoded. A relative `./editor/...` doesn't work: the browser resolves it
 * against `/` when the page is served as `/hub` with no trailing slash,
 * which is a 404.
 */
export function editorHref(id: string): string {
    if (typeof window === 'undefined') return ''

    const hubPath = window.location.pathname.replace(/\/(index\.html)?$/, '')
    return `${hubPath}/editor/index.html?id=${encodeURIComponent(id)}`
}
