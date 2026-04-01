import js from '@eslint/js'
import globals from 'globals'
import tseslint from 'typescript-eslint'
import pluginReact from 'eslint-plugin-react'
import json from '@eslint/json'
import markdown from '@eslint/markdown'
import css from '@eslint/css'
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
    },
    {
        plugins: {
            '@stylistic': stylistic,
        },
        files: ['**/*.{js,mjs,cjs,ts,mts,cts,jsx,tsx,astro}'],
        rules: {
            '@stylistic/indent': ['error', 4],
        },
    },
])
