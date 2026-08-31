// @ts-check
import { defineConfig, envField } from 'astro/config'
import 'dotenv/config'

import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'
import svgr from 'vite-plugin-svgr'
import type { AstroIntegration } from 'astro'
import {  join } from 'path'
import node from '@astrojs/node';
import { promises as fs } from 'fs'
import mdx from '@astrojs/mdx'
import sitemap from '@astrojs/sitemap'
import RoboxSectionize from './astro/integrations/markdown/roboxSectionize'
import { isNoindex, PRODUCTION_ORIGIN } from './src/data/seo'

export default defineConfig({
    srcDir: 'src',
    /*
     * Canonical links, the og:image URL and the sitemap are all built off this:
     * crawlers and link unfurlers won't resolve a root-relative path, so they
     * need the origin.
     *
     * Set SITE_URL to point a build at the host it's actually being served from
     * — `SITE_URL=https://dev.robox.com.au npm run build` makes the dev box
     * advertise its own og:image instead of production's. Anything other than
     * PRODUCTION_ORIGIN is also kept out of search; see src/data/seo.ts.
     */
    site: process.env.SITE_URL ?? PRODUCTION_ORIGIN,
    output: "static",
    /*
     * Vite only exposes `PUBLIC_`-prefixed variables to client code, so the
     * publishable key has to be declared here to reach the browser under its
     * own name. `access: 'public'` inlines the value at build time (it is a
     * publishable key — it is meant to ship), and `optional` keeps a missing
     * key a runtime error in the checkout rather than a failed build, which is
     * what the iOS bundle and CI builds without Stripe credentials rely on.
     *
     * Import it from `astro:env/client`; `import.meta.env` will not have it.
     */
    env: {
        schema: {
            STRIPE_PUBLISHABLE_KEY: envField.string({
                context: 'client',
                access: 'public',
                optional: true,
            }),
            /*
             * Google Maps Places key for the checkout's address autocomplete.
             * Stripe only supplies its own key when the Address Element sits in
             * the same Elements group as a Payment Element, and the checkout
             * collects the address a step earlier than that - so this one is
             * ours. Optional: without it the address fields still work, just
             * without suggestions.
             */
            GOOGLE_MAPS_API_KEY: envField.string({
                context: 'client',
                access: 'public',
                optional: true,
            }),
        },
    },
    integrations: [
        react(),
        mdx(),
        // No sitemap in the iOS bundle: it ships as a Capacitor app off the
        // filesystem, so there's nothing there for a crawler to find.
        process.env.IOS_BUILD === 'true'
            ? undefined
            : sitemap({
                  // Same list Meta.astro marks `noindex` from, so a page can't
                  // end up telling crawlers to skip it and then inviting them
                  // in through the sitemap.
                  filter: (page) => !isNoindex(new URL(page).pathname),
              }),
        process.env.IOS_BUILD === 'true' ? transformIOSBuild() : undefined,
    ],
    adapter: node({
        mode: 'standalone',
        staticHeaders: true,
    }),
    security: {
        allowedDomains: [
            {
                hostname: 'dev.robox.com.au',
                protocol: 'https:',
            },
            {
                hostname: 'robox.com.au',
                protocol: 'https:',
            }
        ],
    },
    vite: {
        plugins: [tailwindcss(), svgr()],
        // server: {
        //     host: true,
        //     allowedHosts: [
        //         'dev.robox.com.au',
        //         'robox.com.au',
        //     ],
        // },
        // preview: {
        //     host: true,
        //     allowedHosts: [
        //         'dev.robox.com.au',
        //         'robox.com.au',
        //     ],
        // },
        build: {
            assetsInlineLimit: 1024,
        },
    },
    markdown: {
        remarkPlugins: [RoboxSectionize],
    },
})
function transformIOSBuild(): AstroIntegration {
    return {
        name: 'transform-ios-build',
        hooks: {
            'astro:build:done': async ({ dir, logger }) => {
                // Delete everything in this path except for _astro or /hub
                logger.info(`Transforming iOS build in ${dir.pathname}`)
                const folders = (
                    await fs.readdir(dir.pathname, {
                        withFileTypes: true,
                    })
                ).filter(
                    (dirent) =>
                        dirent.isDirectory() &&
                        dirent.name !== '_astro' &&
                        dirent.name !== 'hub',
                )
                const folderNames = folders.map((folder) => folder.name)
                for (const folderName of folderNames) {
                    const folderPath = join(dir.pathname, folderName)
                    await fs.rm(folderPath, { recursive: true })
                    logger.info(`Deleted ${folderPath}`)
                }
                //Delete index.html in the root of the build
                const indexPath = join(dir.pathname, 'index.html')
                await fs.rm(indexPath)
                logger.info(`Deleted ${indexPath}`)
                //Copy content of /hub to the root of the build
                const studentPath = join(dir.pathname, 'hub')
                await fs.cp(studentPath, dir.pathname, { recursive: true })
                logger.info(
                    `Copied content of ${studentPath} to ${dir.pathname}`,
                )
                //Delete the /hub folder
                await fs.rm(studentPath, { recursive: true })
                logger.info(
                    `Copied content of ${studentPath} to ${dir.pathname} and deleted ${studentPath}`,
                )
            },
        },
    }
}
