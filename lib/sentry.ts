/**
 * Sentry Error Tracking Utilities
 *
 * This module provides helper functions for error tracking and monitoring
 * with Sentry in the Daily Worker Hub application.
 *
 * @see https://docs.sentry.io/platforms/javascript/guides/nextjs/
 */

import * as Sentry from "@sentry/nextjs";
import type { SeverityLevel } from "@sentry/types";

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
 * Additional context for error capture
 */
interface ErrorContext {
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
  user?: SentryUser;
}

/**
 * Capture an exception with optional context
 *
 * Use this to capture and send errors to Sentry with additional context
 * like tags, extra data, and user information.
 *
 * @param error - The error to capture
 * @param context - Optional context including tags, extra data, and user info
 *
 * @example
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   captureException(error, {
 *     tags: { component: 'PaymentForm' },
 *     extra: { orderId: '12345' },
 *     user: { id: 'user-123', email: 'user@example.com' }
 *   });
 * }
 */
export function captureException(error: unknown, context?: ErrorContext): void {
  if (context?.user) {
    Sentry.setUser(context.user);
  }

  Sentry.captureException(error, {
    tags: context?.tags,
    extra: context?.extra,
  });
}

/**
 * Capture a message with a severity level
 *
 * Use this to send custom messages to Sentry for monitoring
 * non-error events like warnings or important business events.
 *
 * @param message - The message to capture
 * @param level - Severity level: 'fatal' | 'error' | 'warning' | 'info' | 'debug'
 *
 * @example
 * captureMessage('Payment gateway timeout', 'warning');
 * captureMessage('User completed onboarding', 'info');
 */
export function captureMessage(
  message: string,
  level: SeverityLevel = "info"
): void {
  Sentry.captureMessage(message, level);
}

/**
 * Set user context for error tracking
 *
 * Call this when a user logs in to associate errors with the user.
 * This helps identify which users were affected by specific errors.
 *
 * @param user - User object with id and optional email/username/role
 *
 * @example
 * // On login
 * setUserContext({
 *   id: user.id,
 *   email: user.email,
 *   username: user.name,
 *   role: 'business'
 * });
 *
 * // On logout
 * setUserContext(null);
 */
export function setUserContext(user: SentryUser | null): void {
  if (user) {
    Sentry.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
      // Add role as a tag for easier filtering in Sentry
      role: user.role,
    });
  } else {
    Sentry.setUser(null);
  }
}

/**
 * Add a breadcrumb for error context
 *
 * Breadcrumbs are events that happened before an error.
 * They help you understand what led to the error.
 *
 * @param category - Category of the breadcrumb (e.g., 'api', 'navigation', 'user')
 * @param message - Description of the event
 * @param data - Optional additional data
 *
 * @example
 * addBreadcrumb('api', 'Fetching worker profile', { workerId: '123' });
 * addBreadcrumb('navigation', 'User navigated to job listings');
 * addBreadcrumb('user', 'User clicked apply button', { jobId: '456' });
 */
export function addBreadcrumb(
  category: string,
  message: string,
  data?: Record<string, unknown>
): void {
  Sentry.addBreadcrumb({
    category,
    message,
    data,
    level: "info",
    timestamp: Date.now() / 1000,
  });
}

/**
 * Start a new transaction for performance monitoring
 *
 * Use this to measure the duration of important operations.
 *
 * @param name - Name of the transaction
 * @param op - Operation type (e.g., 'http.server', 'db.query')
 *
 * @example
 * const transaction = startTransaction('process-payment', 'payment');
 * // ... do work ...
 * transaction.finish();
 */
export function startTransaction(name: string, op: string) {
  return Sentry.startTransaction({ name, op });
}

/**
 * Set a tag for error categorization
 *
 * Tags are key-value pairs that can be used to filter and search errors.
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
 * Set extra context for the current scope
 *
 * Extra data is arbitrary key-value pairs attached to events.
 *
 * @param key - Context key
 * @param value - Context value
 *
 * @example
 * setExtra('orderId', '12345');
 * setExtra('retryCount', 3);
 */
export function setExtra(key: string, value: unknown): void {
  Sentry.setExtra(key, value);
}

/**
 * Create a wrapped function that captures errors
 *
 * Useful for wrapping event handlers or async functions.
 *
 * @param fn - Function to wrap
 * @param context - Error context to include
 *
 * @example
 * const safeHandler = withErrorTracking(
 *   async (data) => { ... },
 *   { tags: { handler: 'submitJob' } }
 * );
 */
export function withErrorTracking<T extends (...args: unknown[]) => unknown>(
  fn: T,
  context?: ErrorContext
): T {
  return ((...args: Parameters<T>) => {
    try {
      const result = fn(...args);
      // Handle async functions
      if (result instanceof Promise) {
        return result.catch((error) => {
          captureException(error, context);
          throw error;
        });
      }
      return result;
    } catch (error) {
      captureException(error, context);
      throw error;
    }
  }) as T;
}

/**
 * Report API errors with structured context
 *
 * Specialized helper for API error reporting.
 *
 * @param error - The error
 * @param endpoint - API endpoint that failed
 * @param method - HTTP method
 * @param statusCode - HTTP status code (if available)
 */
export function reportApiError(
  error: unknown,
  endpoint: string,
  method: string,
  statusCode?: number
): void {
  captureException(error, {
    tags: {
      component: "api",
      endpoint,
      method,
      ...(statusCode && { statusCode: String(statusCode) }),
    },
    extra: {
      endpoint,
      method,
      statusCode,
      timestamp: new Date().toISOString(),
    },
  });
}

/**
 * Report payment errors with financial context
 *
 * Specialized helper for payment-related errors.
 *
 * @param error - The error
 * @param paymentType - Type of payment (topup, withdrawal, etc.)
 * @param amount - Payment amount (if available)
 * @param userId - User ID involved
 */
export function reportPaymentError(
  error: unknown,
  paymentType: "topup" | "withdrawal" | "payment",
  amount?: number,
  userId?: string
): void {
  captureException(error, {
    tags: {
      component: "payment",
      paymentType,
    },
    extra: {
      paymentType,
      amount,
      userId,
      timestamp: new Date().toISOString(),
    },
  });
}

// Re-export Sentry for direct access if needed
export { Sentry };
