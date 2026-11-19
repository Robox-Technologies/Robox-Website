import { pico } from '@/libs/communication/communicate'
import type { LinkState } from '../protocol/controllerLink'

const SPEED_STORAGE_KEY = 'robox:controller:maxSpeed'

/** Remembered per browser. Storage can be unavailable (private mode). */
export function loadMaxSpeed(): string | null {
    try {
        return localStorage.getItem(SPEED_STORAGE_KEY)
    } catch {
        return null
    }
}

export function saveMaxSpeed(value: string): void {
    try {
        localStorage.setItem(SPEED_STORAGE_KEY, value)
    } catch {}
}

export const LINK_DOT_CLASSES: Record<LinkState, string> = {
    idle: 'bg-tone3',
    starting: 'bg-blue',
    active: 'bg-green',
    closing: 'bg-tone3',
}

export function linkStatusText(state: LinkState): string {
    if (state !== 'active') return 'Not connected'
    const method =
        pico.getState().communicationMethod === 'USB' ? 'USB' : 'Bluetooth'
    return `Connected over ${method}`
}

/** `/hub` on the web, the root in the iOS build, where the hub is hoisted. */
function hubRoot(): string {
    return window.location.pathname.replace(
        /\/controller(\/(index\.html)?)?$/,
        '',
    )
}

export function hubHomeUrl(): string {
    return `${hubRoot()}/`
}

/** Opened from a project: go back to it, carrying the connection over. */
export function projectReturnUrl(projectId: string): URL {
    const url = new URL(
        `${hubRoot()}/editor/index.html`,
        window.location.origin,
    )
    url.searchParams.set('id', projectId)
    const handoff = pico.getConnectionHandoff()
    if (handoff) {
        url.searchParams.set('connectionMethod', handoff.method)
        url.searchParams.set('deviceId', handoff.deviceId)
    }
    return url
}
