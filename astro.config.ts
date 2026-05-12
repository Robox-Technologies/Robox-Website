// @ts-check
import { defineConfig } from 'astro/config'
import 'dotenv/config'

import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'
import svgr from 'vite-plugin-svgr'
import type { AstroIntegration } from 'astro'
import { resolve, join } from 'path'
import { promises as fs } from 'fs'
import mdx from '@astrojs/mdx'
import RoboxSectionize from './astro/integrations/markdown/roboxSectionize'

export default defineConfig({
    srcDir: 'src',
    "output": "static",
    integrations: [
        react(),
        mdx(),
        process.env.IOS_BUILD === 'true' ? transformIOSBuild() : undefined,
    ],
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
        preview: {
            allowedHosts: [
                'dev.robox.com.au',
                'robox.com.au',
            ],
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
                // Delete everything in this path except for _astro or /student
                logger.info(`Transforming iOS build in ${dir.pathname}`)
                const folders = (
                    await fs.readdir(dir.pathname, {
                        withFileTypes: true,
                    })
                ).filter(
                    (dirent) =>
                        dirent.isDirectory() &&
                        dirent.name !== '_astro' &&
                        dirent.name !== 'student',
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
                //Copy content of /student to the root of the build
                const studentPath = join(dir.pathname, 'student')
                await fs.cp(studentPath, dir.pathname, { recursive: true })
                logger.info(
                    `Copied content of ${studentPath} to ${dir.pathname}`,
                )
                //Delete the /student folder
                await fs.rm(studentPath, { recursive: true })
                logger.info(
                    `Copied content of ${studentPath} to ${dir.pathname} and deleted ${studentPath}`,
                )
            },
        },
    }
}
