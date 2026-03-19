# Sentry Error Tracking Setup

This document describes the Sentry error tracking setup for Daily Worker Hub.

## Overview

Sentry provides real-time error tracking and performance monitoring for web applications. This setup includes:

- Client-side error tracking (browser)
- Server-side error tracking (Node.js)
- Edge runtime support (middleware, edge functions)
- Source maps for readable stack traces
- Session replay for debugging
- Performance monitoring

## Prerequisites

1. Create a Sentry account at [sentry.io](https://sentry.io)
2. Create a new Next.js project in Sentry
3. Note your DSN from Project Settings > Client Keys (DSN)

## Environment Variables

Add these variables to your `.env.local` file:

```bash
# Sentry Configuration
# Required for error tracking to work

# Public DSN (safe to expose to browser)
NEXT_PUBLIC_SENTRY_DSN=https://your-key@o0.ingest.sentry.io/0

# Auth token for source map uploads (CI/CD only)
# Get from: Sentry > Settings > Account > Auth Tokens
SENTRY_AUTH_TOKEN=your-auth-token

# Your Sentry organization slug
SENTRY_ORG=your-org-slug

# Your Sentry project slug
SENTRY_PROJECT=daily-worker-hub
```

### Vercel Deployment

For Vercel deployments, set these environment variables in your project settings:

1. Go to Project Settings > Environment Variables
2. Add all four variables above
3. Make sure to mark `SENTRY_AUTH_TOKEN` as sensitive (it won't be exposed to the browser)

## Configuration Files

### `sentry.client.config.ts`

Configures Sentry for client-side (browser) error tracking.

Features:
- Error capture with stack traces
- Session replay (10% sample rate, 100% on errors)
- Automatic breadcrumbs

### `sentry.server.config.ts`

Configures Sentry for server-side (Node.js) error tracking.

Features:
- Server-side error capture
- API route error tracking
- Server component error tracking

### `sentry.edge.config.ts`

Configures Sentry for edge runtime (middleware, edge functions).

Features:
- Middleware error tracking
- Edge function error tracking

## Helper Functions

The `lib/sentry.ts` file provides utility functions for error tracking:

### `captureException(error, context?)`

Capture an exception with optional context.

```typescript
import { captureException } from "@/lib/sentry";

try {
  await riskyOperation();
} catch (error) {
  captureException(error, {
    tags: { component: "PaymentForm" },
    extra: { orderId: "12345" },
    user: { id: "user-123", email: "user@example.com" },
  });
}
```

### `captureMessage(message, level)`

Send a custom message to Sentry.

```typescript
import { captureMessage } from "@/lib/sentry";

captureMessage("Payment gateway timeout", "warning");
captureMessage("User completed onboarding", "info");
```

### `setUserContext(user)`

Set user context for error tracking.

```typescript
import { setUserContext } from "@/lib/sentry";

// On login
setUserContext({
  id: user.id,
  email: user.email,
  username: user.name,
  role: "business",
});

// On logout
setUserContext(null);
```

### `addBreadcrumb(category, message, data?)`

Add breadcrumbs for error context.

```typescript
import { addBreadcrumb } from "@/lib/sentry";

addBreadcrumb("api", "Fetching worker profile", { workerId: "123" });
addBreadcrumb("navigation", "User navigated to job listings");
```

### `reportApiError(error, endpoint, method, statusCode?)`

Report API errors with structured context.

```typescript
import { reportApiError } from "@/lib/sentry";

reportApiError(error, "/api/jobs", "GET", 500);
```

### `reportPaymentError(error, paymentType, amount?, userId?)`

Report payment-related errors.

```typescript
import { reportPaymentError } from "@/lib/sentry";

reportPaymentError(error, "withdrawal", 500000, "user-123");
```

## Error Boundaries

### Page-Level Error Boundaries

Each section has its own error boundary:

- `app/admin/error.tsx` - Admin section errors
- `app/(dashboard)/business/error.tsx` - Business dashboard errors
- `app/(dashboard)/worker/error.tsx` - Worker dashboard errors
- `app/global-error.tsx` - Root-level fatal errors

All error boundaries automatically report errors to Sentry.

### Reusable Error Boundary Component

Use the `ErrorBoundary` component for component-level error handling:

```tsx
import { ErrorBoundary } from "@/components/error-boundary";

function MyPage() {
  return (
    <ErrorBoundary fallback={<CustomErrorUI />}>
      <MyComponent />
    </ErrorBoundary>
  );
}
```

### Higher-Order Component

Wrap components with error boundaries using the HOC:

```tsx
import { withErrorBoundary } from "@/components/error-boundary";

const SafeComponent = withErrorBoundary(MyComponent, <FallbackUI />);
```

## Monitoring & Alerting

### Setting Up Alerts in Sentry

1. Go to Alerts in your Sentry project
2. Create alert rules for:

   - **High Priority Errors**: Any error with tag `fatalError: true`
   - **Payment Errors**: Errors with tag `component: payment`
   - **API Errors**: Errors with tag `component: api` and status 5xx
   - **Error Rate Spike**: More than 10 errors per minute

### Recommended Alert Rules

| Rule | Condition | Action |
|------|-----------|--------|
| Fatal Errors | `tags.fatalError = true` | Email + Slack |
| Payment Failures | `tags.component = payment` | Email + Slack |
| High Error Rate | > 10 errors/minute | Slack |
| API 5xx Errors | `tags.statusCode starts with 5` | Email |

### Dashboards

Create a dashboard with these widgets:

1. **Error Count** - Total errors over time
2. **Error by Section** - Grouped by `section` tag
3. **Top Errors** - Most frequent errors
4. **User Impact** - Users affected count
5. **API Latency** - Transaction duration for API calls

## Source Maps

Source maps are automatically uploaded during build when `SENTRY_AUTH_TOKEN` is set.

### Local Development

Source maps are not uploaded in development mode.

### Production Deployment

1. Set `SENTRY_AUTH_TOKEN` in your CI/CD environment
2. Run `npm run build`
3. Source maps will be uploaded automatically

## Privacy Considerations

- `maskAllText: true` - All text is masked in session replays
- `blockAllMedia: true` - Media is blocked in session replays
- User data is only included when explicitly set via `setUserContext()`

## Best Practices

1. **Always add context** - Use tags and extra data to make errors searchable
2. **Set user context** - Call `setUserContext()` after login
3. **Use breadcrumbs** - Add breadcrumbs for important user actions
4. **Handle errors gracefully** - Use error boundaries with fallback UIs
5. **Monitor alerts** - Review and act on Sentry alerts promptly
6. **Sample rate tuning** - Adjust `tracesSampleRate` and `replaysSessionSampleRate` based on traffic

## Troubleshooting

### Errors not appearing in Sentry

1. Verify `NEXT_PUBLIC_SENTRY_DSN` is set correctly
2. Check browser console for Sentry initialization errors
3. Ensure you're not blocking Sentry domains

### Source maps not working

1. Verify `SENTRY_AUTH_TOKEN` is set in build environment
2. Check `SENTRY_ORG` and `SENTRY_PROJECT` match your Sentry project
3. Ensure build is not being cached

### Performance issues

1. Reduce `tracesSampleRate` (e.g., 0.1 for 10%)
2. Reduce `replaysSessionSampleRate`
3. Disable `reactComponentAnnotation` if not needed

## Resources

- [Sentry Next.js Documentation](https://docs.sentry.io/platforms/javascript/guides/nextjs/)
- [Sentry React Documentation](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Performance Monitoring](https://docs.sentry.io/product/performance/)
- [Session Replay](https://docs.sentry.io/product/session-replay/)
