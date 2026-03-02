// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';
import tailwindcss from '@tailwindcss/vite';
import svgr from 'vite-plugin-svgr';
export default defineConfig({
    srcDir: "src",
    integrations: [react()],

    vite: {
        // @ts-expect-error - This is going to be an issue until Astro V6 with Vite 7
        plugins: [tailwindcss(), svgr()]
    }
});