// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import svgr from 'vite-plugin-svgr';
import RoboxSectionize from './astro/integrations/markdown/roboxSectionize';
import mdx from '@astrojs/mdx';
export default defineConfig({
    srcDir: "src",
    integrations: [react(), mdx()],

    vite: {
        plugins: [tailwindcss(), svgr()]
    },
    markdown: {
        remarkPlugins: [
            RoboxSectionize
        ]
    }
});