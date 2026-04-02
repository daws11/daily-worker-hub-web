import { defineConfig } from "vitest/config";
import path from "path";

const OTHER_WORKTREE = "/Users/yanuar/Documents/daws/daily-worker-hub-web/.auto-claude/worktrees/tasks/002-fix-n-1-query-in-generateworkershortlist-availabil/node_modules";

export default defineConfig({
  test: {
    environment: "happy-dom",
    globals: true,
    setupFiles: ["./vitest.setup.ts"],
    include: ["lib/**/__tests__/**/*.test.ts", "lib/**/*.test.ts", "tests/**/*.test.ts"],
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
      // Resolve next and @supabase/ssr from another worktree that has them installed
      { find: /^next$/, replacement: `${OTHER_WORKTREE}/next` },
      { find: /^next\/server$/, replacement: `${OTHER_WORKTREE}/next/dist/server/next.js` },
      { find: /^@supabase\/ssr$/, replacement: `${OTHER_WORKTREE}/@supabase/ssr/dist/module/index.js` },
    ],
    dedupe: ["react", "react-dom"],
  },
});
