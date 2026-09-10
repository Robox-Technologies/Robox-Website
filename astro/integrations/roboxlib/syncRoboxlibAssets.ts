import type { AstroIntegration } from 'astro'
import { copyFileSync, mkdirSync, readdirSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

/*
 * roboxlib's real source lives in a sparse-checked-out submodule (see
 * vendor/robox-python-libs, and scripts/init-roboxlib-submodule.mjs) rather
 * than a copy of the API hand-written here. This copies its .py files into
 * public/hub/roboxlib/, where the Python editor's linting worker (see
 * src/features/editor/editors/pythonEditor/workers/pyodideLint.worker.ts)
 * fetches them from to get real signatures for autocomplete/parameter
 * checking, without ever duplicating the library's definitions by hand.
 *
 * Hooked into astro:config:setup for the same reason as
 * astro/integrations/pyodide/syncPyodideAssets.ts: it needs to run on every
 * astro CLI invocation, not just whichever npm script someone remembers to
 * run.
 */
export function syncRoboxlibAssets(): AstroIntegration {
    return {
        name: 'sync-roboxlib-assets',
        hooks: {
            'astro:config:setup': ({ logger }) => {
                if (process.env.IOS_BUILD === 'true') {
                    logger.info(
                        'IOS_BUILD set, skipping roboxlib asset sync (linting is web-only).',
                    )
                    return
                }

                const rootDir = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..')
                const sourceDir = join(rootDir, 'vendor', 'robox-python-libs', 'src')
                const targetDir = join(rootDir, 'public', 'hub', 'roboxlib')

                const files = readdirSync(sourceDir).filter((name) => name.endsWith('.py'))
                if (files.length === 0) {
                    throw new Error(
                        `No .py files found in ${sourceDir} -- did you run ` +
                            `\`node scripts/init-roboxlib-submodule.mjs\`?`,
                    )
                }

                mkdirSync(targetDir, { recursive: true })
                for (const file of files) {
                    copyFileSync(join(sourceDir, file), join(targetDir, file))
                }
                logger.info(`Synced ${files.length} roboxlib file(s) into public/hub/roboxlib/`)
            },
        },
    }
}
