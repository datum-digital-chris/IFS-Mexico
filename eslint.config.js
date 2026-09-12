import js from "@eslint/js";
import tseslint from "typescript-eslint";
import astroPlugin from "eslint-plugin-astro";
import prettier from "eslint-config-prettier";
import globals from "globals";

export default [
  {
    ignores: ["dist/**", ".astro/**", "node_modules/**", "public/**"],
  },
  {
    // Build-time Node scripts, the Astro config and the Decap OAuth Functions.
    files: ["scripts/**/*.{js,mjs,cjs}", "netlify/functions/**/*.{js,mjs,cjs}", "astro.config.mjs"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.node },
    },
  },
  {
    // These scripts pass functions to page.evaluate(), whose body runs in the
    // browser, so both global sets are legitimately in scope.
    files: ["scripts/screenshot-compare.mjs", "scripts/verify-layout.mjs", "scripts/probe-styles.mjs"],
    languageOptions: { globals: { ...globals.node, ...globals.browser } },
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...astroPlugin.configs.recommended,
  ...astroPlugin.configs["jsx-a11y-recommended"],
  {
    files: ["**/*.{ts,astro}"],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: "module",
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_", varsIgnorePattern: "^_" }],
    },
  },
  prettier,
];
