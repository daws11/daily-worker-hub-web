// This file configures the initialization of Sentry on the server side
// https://docs.sentry.io/platforms/javascript/guides/nextjs/

import * as Sentry from "@sentry/nextjs";

const isDev = process.env.NODE_ENV === "development";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Environment-differentiated traces sample rate:
  // - 1.0 in development: capture all transactions for debugging
  // - 0.05 in production: keep Sentry quota manageable
  tracesSampleRate: isDev ? 1.0 : 0.05,

  // Spotlight dev tracing UI — dev-only, never reaches production
  spotlight: isDev,

  // Setting this option to true will print useful information to the console while you're setting up Sentry.
  debug: isDev,

  // Attach WebVitals to transactions for performance monitoring
  beforeSendTransaction: (event) => {
    // Filter out health-check / synthetic transactions if needed
    return event;
  },
});

// Register span error instrumentation to catch unhandled async errors
// not captured by error boundaries (unhandled promise rejections, etc.)
Sentry.registerSpanErrorInstrumentation();
