import type { CommunicationMethod } from 'src/types/communication'

const STORAGE_KEY = 'roboxCommunicationMethod'

/** The method chosen last time. `null` tells the connect button to ask rather than guess. */
export function getPreferredCommunicationMethod(): CommunicationMethod | null {
    if (typeof window === 'undefined') return null

    const stored = localStorage.getItem(STORAGE_KEY)
    if (
        stored === 'USB' ||
        stored === 'WebBluetooth' ||
        stored === 'iOSBluetooth'
    ) {
        return stored
    }
    return null
}

export function setPreferredCommunicationMethod(
    method: CommunicationMethod,
): void {
    if (typeof window === 'undefined' || !method) return
    localStorage.setItem(STORAGE_KEY, method)
}
