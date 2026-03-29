import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: true,
    include: [
      "lib/**/__tests__/**/*.test.ts",
      "lib/**/*.test.ts",
      "tests/unit/**/*.test.ts",
    ],
    exclude: ["node_modules/", "dist/", ".next/"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["lib/algorithms/**", "lib/utils/**"],
      exclude: ["node_modules/", "__tests__/"],
    },
    testTimeout: 10000,
    hookTimeout: 10000,
    setupFiles: ["./vitest.setup.ts"],
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./"),
    },
  },
});
