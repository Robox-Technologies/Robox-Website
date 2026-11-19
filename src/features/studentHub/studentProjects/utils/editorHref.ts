/**
 * URL of a page under the hub, from the hub home. Derived from where the hub is served,
 * since it's `/hub` on the web and the root in the iOS build; a relative path 404s on `/hub`.
 */
export function hubHref(page: string): string {
    if (typeof window === 'undefined') return ''

    const hubPath = window.location.pathname.replace(/\/(index\.html)?$/, '')
    return `${hubPath}/${page}`
}

export function editorHref(id: string): string {
    return hubHref(`editor/index.html?id=${encodeURIComponent(id)}`)
}
