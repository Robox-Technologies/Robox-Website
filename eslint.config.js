import eslintPluginAstron from 'eslint-plugin-astro';
import stylistic from '@stylistic/eslint-plugin'

export default [
    ...eslintPluginAstron.configs.recommended,
    {
        plugins: {
            '@stylistic': stylistic,
        },
        rules: {
            '@stylistic/indent': ['error', 4],
        },
    }
];