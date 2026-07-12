import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
    appId: 'com.robox.app',
    appName: 'Ro/Box',
    // Astro's hybrid build (the /api route pulls in the node adapter) emits the
    // client bundle into dist/client, which is the web entry point Capacitor ships.
    webDir: 'dist/client',
    // Match the page background (--color-primary, #f8f8f8) so the WKWebView
    // doesn't paint a white frame between documents on navigation — this is
    // what removes the flash now that there's no cross-fade to mask it.
    backgroundColor: '#f8f8f8ff',
    ios: {
        backgroundColor: '#f8f8f8ff',
    },
    plugins: {
        CapacitorSQLite: {
            // Store the SQLite database in the app's Library directory so it
            // persists and is not wiped like WKWebView localStorage/IndexedDB.
            iosDatabaseLocation: 'Library/RoboxDatabase',
            iosIsEncryption: false,
        },
    },
}

export default config
