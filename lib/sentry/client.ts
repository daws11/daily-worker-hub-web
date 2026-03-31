/**
 * Sentry Client-Side Utilities
 *
 * This module provides typed helper functions for error tracking with Sentry
 * that are safe for client-side (browser) use only.
 *
 * These functions wrap the Sentry SDK's core methods and should be used
 * throughout the application instead of calling Sentry methods directly.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

import * as Sentry from "@sentry/nextjs";

// SeverityLevel type definition (compatible with @sentry/types)
type SeverityLevel = "fatal" | "error" | "warning" | "info" | "debug";

/**
 * User context interface for Sentry user identification
 */
interface SentryUser {
  id: string;
  email?: string;
  username?: string;
  role?: "business" | "worker" | "admin";
}

/**
 * Breadcrumb data for event context
 */
interface BreadcrumbData {
  category: string;
  message: string;
  level?: SeverityLevel;
  data?: Record<string, unknown>;
}

/**
 * Capture an error and send it to Sentry
 *
 * Use this to capture and send errors to Sentry with optional context.
 * This is the primary client-side error reporting function.
 *
 * @param error - The error to capture (Error object or string)
 * @param context - Optional context options
 *
 * @example
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   captureError(error, {
 *     tags: { component: 'PaymentForm' },
 *     extra: { orderId: '12345' }
 *   });
 * }
 */
export function captureError(
  error: unknown,
  context?: {
    tags?: Record<string, string>;
    extra?: Record<string, unknown>;
    user?: SentryUser;
    level?: SeverityLevel;
  },
): void {
  if (context?.user) {
    Sentry.setUser(context.user);
  }

  if (context?.tags) {
    for (const [key, value] of Object.entries(context.tags)) {
      Sentry.setTag(key, value);
    }
  }

  if (context?.extra) {
    for (const [key, value] of Object.entries(context.extra)) {
      Sentry.setExtra(key, value);
    }
  }

  // Sentry SDK uses captureException internally; captureError is the public alias
  Sentry.captureException(error, {
    tags: context?.tags,
    extra: context?.extra,
  });
}

/**
 * Add a breadcrumb for error context
 *
 * Breadcrumbs are events that happened before an error.
 * They help understand what led to the error.
 *
 * @param breadcrumb - Breadcrumb data including category and message
 *
 * @example
 * addBreadcrumb({
 *   category: 'api',
 *   message: 'Fetching worker profile',
 *   data: { workerId: '123' }
 * });
 */
export function addBreadcrumb(breadcrumb: BreadcrumbData): void {
  Sentry.addBreadcrumb({
    category: breadcrumb.category,
    message: breadcrumb.message,
    data: breadcrumb.data,
    level: breadcrumb.level ?? "info",
    timestamp: Date.now() / 1000,
  });
}

/**
 * Set user context for error tracking
 *
 * Call this when a user logs in to associate errors with the user.
 * This helps identify which users were affected by specific errors.
 *
 * @param user - User object with id and optional email/username/role,
 *               or null to clear user context on logout
 *
 * @example
 * // On login
 * setUser({ id: user.id, email: user.email, username: user.name });
 *
 * // On logout
 * setUser(null);
 */
export function setUser(user: SentryUser | null): void {
  Sentry.setUser(user);
}

/**
 * Set a tag for error categorization
 *
 * Tags are key-value pairs that can be used to filter and search errors
 * in the Sentry dashboard.
 *
 * @param key - Tag key
 * @param value - Tag value
 *
 * @example
 * setTag('feature', 'job-matching');
 * setTag('version', '1.0.0');
 */
export function setTag(key: string, value: string): void {
  Sentry.setTag(key, value);
}

/**
 * Set context data for the current scope
 *
 * Context data is arbitrary key-value pairs attached to events.
 * Use this to add application-specific information to error reports.
 *
 * @param key - Context key
 * @param value - Context value (must be serializable)
 *
 * @example
 * setContext('page', { url: window.location.href, referrer: document.referrer });
 * setContext('user', { isPremium: true, plan: 'pro' });
 */
export function setContext(key: string, value: Record<string, unknown>): void {
  Sentry.setContext(key, value);
}
