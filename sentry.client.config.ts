// This file configures the initialization of Sentry on the client side
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

  replaysOnErrorSampleRate: 1.0,

  // This sets the sample rate to be 10%. You may want this to be 100% while
  // in development and sample at a lower rate in production
  replaysSessionSampleRate: 0.1,

  // You can remove this option if you're not planning to use the Sentry Session Replay feature:
  integrations: [
    Sentry.replayIntegration({
      // Additional Replay configuration goes in here, for example:
      maskAllText: true,
      blockAllMedia: true,
    }),
    Sentry.feedbackIntegration({
      autoInject: false,
    }),
  ],
});
