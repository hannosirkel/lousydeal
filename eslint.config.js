// @ts-check
import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  {
    ignores: [
      "node_modules/**",
      "coverage/**",
      "backend/.medusa/**",
      "storefront/.next/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.ts"],
    rules: {
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
    },
  },
  {
    // `design/` holds build-time tools rather than application code: they run
    // in Node and drive a browser, so one file legitimately contains both sets
    // of globals -- `process` and `URL` at the top level, `document` inside the
    // callbacks the browser evaluates. Declaring them here is narrower than the
    // alternative, which is scattering eslint-disable comments through a file
    // whose whole job is to be read alongside the artwork it produces.
    files: ["design/**/*.mjs"],
    languageOptions: {
      globals: {
        console: "readonly",
        document: "readonly",
        process: "readonly",
        URL: "readonly",
      },
    },
  },
);
