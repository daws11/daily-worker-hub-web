import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Disable Turbopack to avoid symlink issues in worktree
  experimental: {
    turbo: undefined,
  },
};

export default nextConfig;
