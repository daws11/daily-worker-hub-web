// This file configures the initialization of Sentry for edge features (middleware, edge functions, etc.)
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const isDev = process.env.NODE_ENV === "development";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment-differentiated traces sample rate:
  // - 1.0 in development: capture all transactions for debugging
  // - 0.05 in production: keep Sentry quota manageable
  tracesSampleRate: isDev ? 1.0 : 0.05,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: isDev,
});
