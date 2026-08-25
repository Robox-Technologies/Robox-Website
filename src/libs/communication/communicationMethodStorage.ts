import type { CommunicationMethod } from 'src/types/communication'

const STORAGE_KEY = 'roboxCommunicationMethod'

/**
 * The communication method the user chose last time, if any. `null` means
 * they've never chosen one on this device — that's what tells the connect
 * button to ask instead of guessing.
 */
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
