import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import pluginReact from 'eslint-plugin-react'
import json from '@eslint/json'
import markdown from '@eslint/markdown'
import css from '@eslint/css'
import { tailwind4 } from 'tailwind-csstree'
import eslintPluginAstro from 'eslint-plugin-astro'
import stylistic from '@stylistic/eslint-plugin'
import { defineConfig } from 'eslint/config'

export default defineConfig([
    {
        ignores: [
            'node_modules/**',
            'dist/**',
            'build/**',
            '.astro/**',
            'ios/**',
            'public/**',
            'package-lock.json',
            'package.json',
        ],
    },
    {
        ...js.configs.recommended,
        files: ['**/*.{js,mjs,cjs,jsx}'],
    },
    ...tseslint.configs.recommended.map((config) => ({
        ...config,
        files: ['**/*.{ts,mts,cts,tsx}'],
    })),
    ...eslintPluginAstro.configs['flat/recommended'],
    {
        ...pluginReact.configs.flat.recommended,
        files: ['**/*.{jsx,tsx}'],
        settings: { react: { version: 'detect' } },
    },
    {
        ...pluginReact.configs.flat['jsx-runtime'],
        files: ['**/*.{jsx,tsx}'],
    },
    {
        files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx,astro}'],
        languageOptions: {
            globals: { ...globals.browser, ...globals.node },
        },
    },
    {
        files: ['**/*.json'],
        language: 'json/json',
        ...json.configs.recommended,
    },
    ...markdown.configs.recommended,
    {
        files: ['**/*.css'],
        language: 'css/css',
        ...css.configs.recommended,
        // Teaches the CSS lexer Tailwind v4's at-rules so `@theme`/`@apply` parse.
        languageOptions: {
            tolerant: true,
            customSyntax: tailwind4,
        },
        rules: {
            ...css.configs.recommended.rules,
            // Tailwind emits `@theme` variables as `:root` custom properties at build
            // time, but the rule's scope analysis only sees real `:root` blocks.
            'css/no-invalid-properties': [
                'error',
                { allowUnknownVariables: true },
            ],
        },
    },
    {
        files: [
            'src/layouts/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx,astro}',
            'src/utils/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
            'src/libs/**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx}',
        ],
        rules: {
            'no-restricted-imports': [
                'error',
                {
                    patterns: [
                        {
                            group: ['@features/*/*', 'src/features/*/*'],
                            message:
                                'Shared layers must import features only via public APIs like @features/<feature>.',
                        },
                    ],
                },
            ],
        },
    },

    {
        plugins: {
            '@stylistic': stylistic,
        },
        // .astro only: Prettier has no parser for it here, so this is the sole
        // indentation guard. Everywhere else Prettier owns indentation, and the
        // two disagree on nested ternaries -- running both just oscillates.
        files: ['**/*.astro'],
        rules: {
            '@stylistic/indent': ['error', 4],
        },
    },
])
