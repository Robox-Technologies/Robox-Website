// .mjs, not .ts: Prettier loads this through Node's ESM loader, which can't import TypeScript.

/** @type {import("prettier").Config} */
const config = {
    semi: false,
    singleQuote: true,
    tabWidth: 4,
    trailingComma: 'all',
}

export default config
