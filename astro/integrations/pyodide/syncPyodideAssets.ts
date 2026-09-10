import type { AstroIntegration } from 'astro'
import { copyFileSync, mkdirSync, readdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const RUNTIME_FILE_PATTERN = /^pyodide\.asm\.|^python_stdlib\.zip$|^pyodide-lock\.json$/

/*
 * Pyodide is a normal npm dependency, so its wasm/stdlib runtime (~13MB) is
 * already on disk in node_modules after install -- this copies it into
 * public/hub/pyodide/, where the Python editor's linting worker (see
 * src/features/editor/editors/pythonEditor/config/linting.ts) expects to
 * fetch it from, so the binary itself never has to live in git.
 *
 * Hooked into astro:config:setup rather than an npm pre-script so it runs on
 * every invocation of the astro CLI (dev, build, check, preview) no matter
 * how it's launched, instead of only when someone remembers to go through
 * `npm run dev`/`npm run build` specifically.
 */
export function syncPyodideAssets(): AstroIntegration {
    return {
        name: 'sync-pyodide-assets',
        hooks: {
            'astro:config:setup': ({ logger }) => {
                if (process.env.IOS_BUILD === 'true') {
                    logger.info(
                        'IOS_BUILD set, skipping Pyodide asset sync (linting is web-only).',
                    )
                    return
                }

                const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
                const sourceDir = join(rootDir, 'node_modules', 'pyodide')
                const targetDir = join(rootDir, 'public', 'hub', 'pyodide')

                const files = readdirSync(sourceDir).filter((name) =>
                    RUNTIME_FILE_PATTERN.test(name),
                )
                if (files.length === 0) {
                    throw new Error(`No Pyodide runtime files found in ${sourceDir}`)
                }

                mkdirSync(targetDir, { recursive: true })
                for (const file of files) {
                    copyFileSync(join(sourceDir, file), join(targetDir, file))
                }
                logger.info(`Synced ${files.length} Pyodide runtime file(s) into public/hub/pyodide/`)
            },
        },
    }
}
