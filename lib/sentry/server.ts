/**
 * Sentry Server-Side Utilities
 *
 * This module provides typed helper functions for error tracking with Sentry
 * that are safe for server-side (Node.js) use only.
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
 * This is the primary server-side error reporting function.
 *
 * @param error - The error to capture (Error object or string)
 * @param context - Optional context options
 *
 * @example
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   captureError(error, {
 *     tags: { component: 'ApiHandler' },
 *     extra: { endpoint: '/api/jobs' }
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
 *   category: 'db',
 *   message: 'Query executed',
 *   data: { query: 'SELECT * FROM jobs', duration: 45 }
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
 * setTag('endpoint', '/api/jobs');
 * setTag('method', 'POST');
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
 * setContext('request', { method: 'GET', path: '/api/jobs' });
 * setContext('database', { query: 'SELECT', rows: 10 });
 */
export function setContext(key: string, value: Record<string, unknown>): void {
  Sentry.setContext(key, value);
}

/**
 * Start a new span for performance monitoring
 *
 * Use this to measure the duration of important server-side operations.
 * Spans are automatically recorded in Sentry's performance traces.
 *
 * @param name - Name of the span
 * @param callback - Async or sync function to wrap with the span
 * @returns The result of the callback function
 *
 * @example
 * const result = await startSpan('db-query', async () => {
 *   return await db.query('SELECT * FROM jobs');
 * });
 */
export async function startSpan<T>(
  name: string,
  callback: () => T | Promise<T>,
): Promise<T> {
  return Sentry.startSpan({ name, op: "server.function" }, callback);
}
