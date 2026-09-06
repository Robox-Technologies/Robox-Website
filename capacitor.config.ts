import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
    appId: 'com.robox.editor',
    appName: 'Ro/Box',
    // Astro's hybrid build (the /api route pulls in the node adapter) emits the
    // client bundle into dist/client, which is the web entry point Capacitor ships.
    webDir: 'dist/client',
    // Matches --color-primary so the WKWebView doesn't flash white between documents.
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
