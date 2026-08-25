/**
 * Prettier config.
 *
 * .mjs rather than .ts: Prettier loads this through Node's ESM loader, which
 * cannot import TypeScript without a type-stripping flag, so a .ts config made
 * every prettier invocation fail with "Unknown file extension .ts". There is
 * nothing here that needs types.
 */

/** @type {import("prettier").Config} */
const config = {
    semi: false,
    singleQuote: true,
    tabWidth: 4,
    trailingComma: 'all',
}

export default config
