// @ts-check
import { defineConfig } from 'astro/config'

import react from '@astrojs/react'
import tailwindcss from '@tailwindcss/vite'
import svgr from 'vite-plugin-svgr'
import RoboxSectionize from './astro/integrations/markdown/roboxSectionize'
import mdx from '@astrojs/mdx'
export default defineConfig({
    srcDir: 'src',
    integrations: [react(), mdx()],

    vite: {
        //@ts-expect-error Vite's typings don't recognize this plugin, but it works correctly at runtime
        plugins: [tailwindcss(), svgr()],
    },
    markdown: {
        remarkPlugins: [RoboxSectionize],
    },
})
