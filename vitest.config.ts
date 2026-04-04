import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["lib/**/__tests__/**/*.test.ts", "lib/**/*.test.ts", "tests/**/*.test.ts", "__tests__/**/*.test.ts"],
    exclude: ["node_modules/", "dist/", ".next/"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html"],
      include: ["lib/algorithms/**", "lib/utils/**"],
      exclude: ["node_modules/", "__tests__/"],
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: [
      { find: "@", replacement: path.resolve(__dirname, "./") },
    ],
    dedupe: ["react", "react-dom"],
  },
});
