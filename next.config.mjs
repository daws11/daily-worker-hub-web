import withPWA from "next-pwa";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const config = {
  reactStrictMode: true,
  pageExtensions: ['tsx', 'ts', 'jsx', 'js'],
  allowedDevOrigins: [
    'frisky-unformalistic-isabell.ngrok-free.dev',
    '.ngrok-free.dev',
  ],
  turbopack: {
    root: __dirname,
  },
  async redirects() {
    return [
      {
        source: '/business/applicants',
        destination: '/business/workers',
        permanent: true, // 301 redirect for SEO
      },
      {
        source: '/business/attendance',
        destination: '/business/job-attendance',
        permanent: true, // 301 redirect for SEO
      },
    ];
  },
};

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  // Disable workbox logs
  sw: "sw.js",
  // Cache strategies for PWA
  runtimeCaching: [
    {
      urlPattern: /^https?.*/,
      handler: "NetworkFirst",
      options: {
        cacheName: "offlineCache",
        expiration: {
          maxEntries: 200,
        },
      },
    },
  ],
})(config);
