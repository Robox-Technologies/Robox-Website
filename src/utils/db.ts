// Cross-platform SQLite storage for user projects: a real database file on iOS, where
// WKWebView storage is wiped under pressure, and `jeep-sqlite` (WASM) on the web.
import {
    CapacitorSQLite,
    SQLiteConnection,
    type SQLiteDBConnection,
} from '@capacitor-community/sqlite'
import { Capacitor } from '@capacitor/core'
import type { UserProject } from 'src/types/projects'

const DB_NAME = 'robox'
export const PROJECTS_TABLE = 'projects'
const LEGACY_STORAGE_KEY = 'roboxProjects'

const sqlite = new SQLiteConnection(CapacitorSQLite)
const isWeb = Capacitor.getPlatform() === 'web'

let dbPromise: Promise<SQLiteDBConnection> | null = null

// Register the `jeep-sqlite` web component and initialise its IndexedDB store.
// Only needed on the web platform; native has its own SQLite implementation.
async function setupWebStore(): Promise<void> {
    if (!customElements.get('jeep-sqlite')) {
        // The self-contained build, not `jeep-sqlite/loader` — the loader's deferred chunk
        // isn't served by Vite, leaving the element defined but never hydrated.
        const { JeepSqlite } = await import(
            'jeep-sqlite/dist/components/jeep-sqlite'
        )
        customElements.define('jeep-sqlite', JeepSqlite)
    }
    if (!document.querySelector('jeep-sqlite')) {
        document.body.appendChild(document.createElement('jeep-sqlite'))
    }
    await customElements.whenDefined('jeep-sqlite')
    await sqlite.initWebStore()
}

async function openDatabase(): Promise<SQLiteDBConnection> {
    if (isWeb) {
        await setupWebStore()
    }

    // Reuse an existing connection if one is already registered (survives
    // client-side navigation), otherwise open a fresh one.
    const consistency = await sqlite
        .checkConnectionsConsistency()
        .catch(() => ({ result: false }))
    const isConn = (await sqlite.isConnection(DB_NAME, false)).result

    const db =
        consistency.result && isConn
            ? await sqlite.retrieveConnection(DB_NAME, false)
            : await sqlite.createConnection(
                DB_NAME,
                false,
                'no-encryption',
                1,
                false,
            )

    if (!(await db.isDBOpen()).result) {
        await db.open()
    }

    await db.execute(
        `CREATE TABLE IF NOT EXISTS ${PROJECTS_TABLE} (
            id TEXT PRIMARY KEY NOT NULL,
            data TEXT NOT NULL
        );`,
    )

    await migrateFromLocalStorage(db)

    return db
}

// One-time migration of pre-SQLite projects out of localStorage's `roboxProjects`.
async function migrateFromLocalStorage(db: SQLiteDBConnection): Promise<void> {
    if (typeof localStorage === 'undefined') return
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY)
    if (!raw) return

    try {
        const projects: Record<string, UserProject> = JSON.parse(raw)
        const entries = Object.entries(projects)
        if (entries.length > 0) {
            await db.executeSet(
                entries.map(([id, project]) => ({
                    // INSERT OR IGNORE keeps any project already migrated in a
                    // previous (interrupted) run from being overwritten.
                    statement: `INSERT OR IGNORE INTO ${PROJECTS_TABLE} (id, data) VALUES (?, ?);`,
                    values: [id, JSON.stringify(project)],
                })),
                true,
            )
            await persist()
        }
        localStorage.removeItem(LEGACY_STORAGE_KEY)
    } catch (e) {
        // Leave the legacy key in place so migration can be retried later.
        console.error('Failed to migrate projects from localStorage:', e)
    }
}

// Lazily opens (and memoises) the shared database connection. On failure the
// cached promise is cleared so a later call can retry instead of reusing it.
export function getDB(): Promise<SQLiteDBConnection> {
    if (!dbPromise) {
        dbPromise = openDatabase().catch((e) => {
            dbPromise = null
            throw e
        })
    }
    return dbPromise
}

// Flush the in-memory web database to IndexedDB. No-op on native, where writes
// are already durable on disk.
export async function persist(): Promise<void> {
    if (isWeb) {
        await sqlite.saveToStore(DB_NAME)
    }
}
