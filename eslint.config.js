/** @type {import("eslint").Linter.FlatConfig[]} */
module.exports = [
  {
    ignores: ["node_modules/**", ".next/**", "vitest.config.ts"],
  },
  {
    files: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx"],
    languageOptions: {
      parser: require("@typescript-eslint/parser"),
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: "module",
        ecmaFeatures: { jsx: true },
      },
    },
    rules: {
      "no-unused-vars": "warn",
      "no-console": "warn",
      "prefer-const": "warn",
      "no-undef": "off",
      // Disable this rule since @typescript-eslint/eslint-plugin is not installed
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
];
