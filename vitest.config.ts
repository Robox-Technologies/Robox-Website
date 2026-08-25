import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Vitest rather than node --test: the modules under test use the `@/` and
// `src/` path aliases the app relies on, which Node's resolver cannot follow.
export default defineConfig({
    resolve: {
        alias: {
            '@': fileURLToPath(new URL('./src', import.meta.url)),
            src: fileURLToPath(new URL('./src', import.meta.url)),
        },
    },
    test: {
        include: ['src/**/*.test.ts'],
        environment: 'node',
    },
})
