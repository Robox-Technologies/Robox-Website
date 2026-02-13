// @ts-check
import { defineConfig } from 'astro/config';

import react from '@astrojs/react';

import tailwindcss from '@tailwindcss/vite';
import svgr from "vite-plugin-svgr";
export default defineConfig({
    srcDir: "src",
    integrations: [react()],

    vite: {
        plugins: [tailwindcss(), svgr()]
    }
});