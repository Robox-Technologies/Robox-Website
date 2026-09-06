/**
 * URL of the editor for a project. Derived from where the hub is served, since it's
 * `/hub` on the web and the root in the iOS build; a relative path 404s on `/hub`.
 */
export function editorHref(id: string): string {
    if (typeof window === 'undefined') return ''

    const hubPath = window.location.pathname.replace(/\/(index\.html)?$/, '')
    return `${hubPath}/editor/index.html?id=${encodeURIComponent(id)}`
}
