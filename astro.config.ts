// @ts-check
import { defineConfig } from 'astro/config'
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
import { isNoindex } from './src/data/seo'

export default defineConfig({
    srcDir: 'src',
    // Canonical links and the og:image URL are built off this: crawlers and
    // link unfurlers won't resolve a root-relative path, so they need the
    // origin. Meta.astro throws at build time if this is ever removed.
    site: 'https://robox.com.au',
    output: "static",
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
