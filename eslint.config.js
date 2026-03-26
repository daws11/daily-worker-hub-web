const { defineConfig } = require("eslint/config");

/**
 * ESLint flat config for Daily Worker Hub
 * Migrated from legacy .eslintrc format to ESLint 10+ flat config
 *
 * Note: @next/eslint-plugin-next (next/core-web-vitals) is not installed.
 * Core ESLint rules are configured directly below.
 */
module.exports = defineConfig([
  {
    // Apply to all JavaScript/TypeScript files
    files: ["**/*.{js,jsx,mjs,cjs,ts,tsx}"],

    // Exclude patterns
    ignores: [
      "node_modules/**",
      ".next/**",
      "dist/**",
      "build/**",
      "out/**",
      "*.config.js",
      "*.config.mjs",
      "*.config.ts",
      "playwright/**",
      "scripts/**",
      "docs/**",
      "public/**",
      "migrations/**",
      "supabase/**",
      "e2e/**",
      "screenshots/**",
    ],

    // Language options
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },

    // Linting rules
    rules: {
      // Unused variables
      "no-unused-vars": "warn",

      // Console statements
      "no-console": "warn",

      // Prefer const
      "prefer-const": "warn",

      // No dangling underscores for private members
      "no-underscore-dangle": "off",

      // Disable specific React/JSX rules that Next.js ESLint plugin would enforce
      // (plugin not installed in this environment)
    },
  },

  // TypeScript files with parser
  {
    files: ["**/*.{ts,tsx}"],

    languageOptions: {
      parser: require("@typescript-eslint/parser"),
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },
]);
