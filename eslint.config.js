import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
// import json from "@eslint/json";
import markdown from "@eslint/markdown";
import { defineConfig } from "eslint/config";
import html from "@html-eslint/eslint-plugin";


export default defineConfig([
  { files: ["**/*.{js,mjs,cjs,ts,mts,cts}"], plugins: { js }, extends: ["js/recommended"] },
  { files: ["**/*.{js,mjs,cjs,ts,mts,cts}"], languageOptions: { globals: globals.browser } },
  tseslint.configs.recommended,
  // { files: ["**/*.json"], plugins: { json }, language: "json/json", extends: ["json/recommended"] },
  { files: ["**/*.md"], plugins: { markdown }, language: "markdown/commonmark", extends: ["markdown/recommended"] },
  {
    // recommended configuration included in the plugin
    files: ["**/*.{html,ejs}"],
    ...html.configs["flat/recommended"],
    rules: {
      ...html.configs["flat/recommended"].rules, // Must be defined. If not, all recommended rules will be lost
      "@html-eslint/indent": "off",
      "@html-eslint/element-newline": "off",
      "@html-eslint/quotes": "off",
      "@html-eslint/attrs-newline": "off",
      "@html-eslint/no-multiple-h1": "off",
      "@html-eslint/use-baseline": "off"
    },
  },
]);
