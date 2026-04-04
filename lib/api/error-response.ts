/**
 * Error Response Factory Utilities
 *
 * Provides helper functions for creating consistent, structured error
 * responses across all API routes in the Daily Worker Hub application.
 *
 * Features:
 * - Consistent error response shape: { error: { code, message, details?, traceId? } }
 * - i18n support for translated error messages
 * - Sentry integration for error reporting
 * - Structured logging integration
 * - Locale detection from request headers
 *
 * @example
 * // Simple error response
 * return errorResponse(400, "VALIDATION_ERROR", "Invalid input");
 *
 * @example
 * // With i18n translation
 * return errorResponse(400, "VALIDATION_ERROR", {
 *   code: "VALIDATION_ERROR",
 *   i18nKey: "errors.validationFailed"
 * });
 *
 * @example
 * // In a try/catch block
 * try {
 *   const data = await riskyOperation();
 *   return NextResponse.json({ data });
 * } catch (error) {
 *   return handleApiError(error, request, "getData");
 * }
 */

import { NextResponse } from "next/server";

// ErrorResponse is imported and re-exported from ./errors below
import type { Locale } from "@/lib/i18n/types";

import { ErrorCode, isApiError, toApiError } from "./errors";
import { captureException } from "@/lib/sentry";
import { logError } from "@/lib/logger";
import type { ErrorResponse } from "./errors";

// Re-export ErrorResponse for convenience
export type { ErrorResponse } from "./errors";

/**
 * Default locale for error messages when none can be detected
 */
const DEFAULT_LOCALE: Locale = "id";

/**
 * Locale header key (case-insensitive)
 */
const LOCALE_HEADER = "x-locale";

/**
 * Request ID header key
 */
const REQUEST_ID_HEADER = "x-request-id";

/**
 * Options for creating an error response
 */
export interface CreateErrorResponseOptions {
  /** Machine-readable error code */
  code: string;
  /** i18n translation key for the message (if not provided, code is used as message) */
  i18nKey?: string;
  /** Additional error details to include */
  details?: unknown;
  /** Request trace ID for debugging */
  traceId?: string;
  /** HTTP status code (default: determined by error code mapping) */
  statusCode?: number;
}

/**
 * Error response input types accepted by factory functions
 */
export type ErrorResponseInput =
  | string
  | CreateErrorResponseOptions
  | Error;

/**
 * Detect the user's preferred locale from request headers
 *
 * Checks the x-locale header first, then falls back to Accept-Language.
 *
 * @param request - The incoming request
 * @returns Detected locale or default locale
 */
function detectLocale(request: Request): Locale {
  // Try x-locale header first (explicitly set by client)
  const explicitLocale = request.headers.get(LOCALE_HEADER);
  if (explicitLocale && ["id", "en"].includes(explicitLocale)) {
    return explicitLocale as Locale;
  }

  // Fall back to Accept-Language header
  const acceptLanguage = request.headers.get("accept-language");
  if (acceptLanguage) {
    // Parse the primary language tag (e.g., "en-US" -> "en")
    const primaryTag = acceptLanguage.split(",")[0].split(";")[0].trim();
    const langCode = primaryTag.split("-")[0].toLowerCase();

    if (langCode === "id" || langCode === "en") {
      return langCode as Locale;
    }
  }

  return DEFAULT_LOCALE;
}

/**
 * Extract the request ID from request headers
 *
 * @param request - The incoming request
 * @returns Request ID or undefined if not present
 */
function getRequestId(request: Request): string | undefined {
  return request.headers.get(REQUEST_ID_HEADER) || undefined;
}

/**
 * Get a translated error message from i18n key
 *
 * Attempts to translate the i18n key using the loaded translations.
 * Falls back to the code or a generic message if translation fails.
 *
 * @param i18nKey - The i18n translation key
 * @param locale - The locale to use for translation
 * @param code - Fallback code if i18n lookup fails
 * @returns Translated message or fallback string
 */
async function getTranslatedMessage(
  i18nKey: string | undefined,
  locale: Locale,
  code: string,
): Promise<string> {
  if (!i18nKey) {
    return code;
  }

  try {
    // Dynamically import getTranslation to avoid circular dependencies
    // and to support both sync (cached) and async (first load) usage
    const { getTranslation } = await import("@/lib/i18n/config");
    return getTranslation(locale, i18nKey);
  } catch {
    // If translation fails (e.g., key not found, translations not loaded),
    // fall back to the error code
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[error-response] Failed to translate i18n key: ${i18nKey}, falling back to code: ${code}`,
      );
    }
    return code;
  }
}

/**
 * Create a structured error response object
 *
 * Builds an ErrorResponse object with the standard shape used across
 * all API routes. Supports i18n translation of error messages.
 *
 * @param options - Error response options including code, message/i18nKey, details
 * @param locale - Locale for i18n translation
 * @returns Structured ErrorResponse object
 *
 * @example
 * const response = await createErrorResponse({
 *   code: "RESOURCE_NOT_FOUND",
 *   i18nKey: "errors.notFound",
 *   details: { resourceId: "123" }
 * }, "id");
 *
 * // Returns:
 * // {
 * //   error: {
 * //     code: "RESOURCE_NOT_FOUND",
 * //     message: "Resource tidak ditemukan", // translated
 * //     details: { resourceId: "123" }
 * //   }
 * // }
 */
export async function createErrorResponse(
  options: CreateErrorResponseOptions,
  locale: Locale = DEFAULT_LOCALE,
): Promise<ErrorResponse> {
  const { code, i18nKey, details, traceId } = options;

  const message = await getTranslatedMessage(i18nKey, locale, code);

  const response: ErrorResponse = {
    error: {
      code,
      message,
    },
  };

  if (details !== undefined) {
    response.error.details = details;
  }

  if (traceId) {
    response.error.traceId = traceId;
  }

  return response;
}

/**
 * Create a Next.js NextResponse with an error payload
 *
 * Convenience wrapper that creates both the ErrorResponse object
 * and wraps it in a NextResponse with the appropriate status code.
 *
 * @param statusCode - HTTP status code for the response
 * @param input - Error code string or CreateErrorResponseOptions
 * @param request - The incoming request (for locale detection and trace ID)
 * @returns NextResponse with error payload
 *
 * @example
 * // Simple usage
 * return errorResponse(404, "RESOURCE_NOT_FOUND", request);
 *
 * @example
 * // With i18n key and details
 * return errorResponse(400, {
 *   code: "VALIDATION_ERROR",
 *   i18nKey: "errors.validationFailed",
 *   details: { fields: ["email", "phone"] }
 * }, request);
 */
export async function errorResponse(
  statusCode: number,
  input: ErrorResponseInput,
  request: Request,
): Promise<NextResponse<ErrorResponse>> {
  const locale = detectLocale(request);
  const traceId = getRequestId(request);

  let errorOptions: CreateErrorResponseOptions;

  if (typeof input === "string") {
    errorOptions = { code: input, traceId };
  } else if (input instanceof Error) {
    // Convert generic errors to ApiError structure
    const apiError = toApiError(input);
    errorOptions = {
      code: apiError.code,
      details: apiError.details,
      traceId,
    };
  } else {
    errorOptions = { ...input, traceId };
  }

  // Override status code if specified
  if (statusCode) {
    errorOptions.statusCode = statusCode;
  }

  const responseBody = await createErrorResponse(errorOptions, locale);

  return NextResponse.json(responseBody, {
    status: errorOptions.statusCode ?? statusCode,
  });
}

/**
 * Handle errors in API route handlers
 *
 * Unified error handler that:
 * 1. Normalizes unknown errors to ApiError
 * 2. Reports errors to Sentry
 * 3. Logs errors with structured logging
 * 4. Returns a NextResponse with the appropriate error payload
 *
 * Use this in catch blocks to ensure consistent error handling.
 *
 * @param error - The caught error
 * @param request - The incoming request (for context and locale detection)
 * @param endpoint - API endpoint name for logging/reporting
 * @param method - HTTP method for logging/reporting
 * @returns NextResponse with error payload
 *
 * @example
 * export async function GET(request: Request) {
 *   try {
 *     const data = await getData();
 *     return NextResponse.json({ data });
 *   } catch (error) {
 *     return handleApiError(error, request, "/api/jobs", "GET");
 *   }
 * }
 */
export async function handleApiError(
  error: unknown,
  request: Request,
  endpoint: string,
  method: string,
): Promise<NextResponse<ErrorResponse>> {
  // Normalize to ApiError for consistent handling
  const apiError = toApiError(error);

  // Determine the status code
  const statusCode = apiError.statusCode;

  // Report to Sentry with structured context
  captureException(error, {
    tags: {
      component: "api",
      endpoint,
      method,
      errorCode: apiError.code,
    },
    extra: {
      endpoint,
      method,
      errorCode: apiError.code,
      statusCode,
      timestamp: new Date().toISOString(),
    },
  });

  // Structured error logging
  logError(`API Error in ${method} ${endpoint}`, error, {
    method,
    path: endpoint,
    errorCode: apiError.code,
    statusCode,
  });

  // Return the error response
  return errorResponse(statusCode, apiError, request);
}

/**
 * Create a validation error response
 *
 * Convenience helper for validation errors with field-level details.
 *
 * @param details - Validation error details (e.g., field names, invalid values)
 * @param request - The incoming request
 * @returns NextResponse with validation error payload
 *
 * @example
 * return validationErrorResponse(
 *   { fields: ["email", "phone"], reason: "invalid_format" },
 *   request
 * );
 */
export async function validationErrorResponse(
  details: unknown,
  request: Request,
): Promise<NextResponse<ErrorResponse>> {
  return errorResponse(
    400,
    {
      code: ErrorCode.VALIDATION_ERROR,
      i18nKey: "errors.validationFailed",
      details,
    },
    request,
  );
}

/**
 * Create a not found error response
 *
 * Convenience helper for resource not found errors.
 *
 * @param resource - Name of the resource that was not found
 * @param identifier - Optional identifier of the specific resource
 * @param request - The incoming request
 * @returns NextResponse with not found error payload
 *
 * @example
 * return notFoundErrorResponse("Job", "123", request);
 */
export async function notFoundErrorResponse(
  resource: string,
  identifier?: string,
  request?: Request,
): Promise<NextResponse<ErrorResponse>> {
  const details = identifier ? { resource, identifier } : { resource };

  return errorResponse(
    404,
    {
      code: ErrorCode.RESOURCE_NOT_FOUND,
      i18nKey: "errors.notFound",
      details,
    },
    request ?? new Request("http://localhost"),
  );
}

/**
 * Create an unauthorized error response
 *
 * Convenience helper for authentication/authorization errors.
 *
 * @param message - Optional custom message or i18n key
 * @param request - The incoming request
 * @returns NextResponse with unauthorized error payload
 *
 * @example
 * return unauthorizedErrorResponse("errors.sessionExpired", request);
 */
export async function unauthorizedErrorResponse(
  message?: string,
  request?: Request,
): Promise<NextResponse<ErrorResponse>> {
  return errorResponse(
    401,
    {
      code: ErrorCode.AUTH_UNAUTHORIZED,
      i18nKey: message?.startsWith("errors.") ? message : undefined,
      details: message && !message.startsWith("errors.")
        ? { message }
        : undefined,
    },
    request ?? new Request("http://localhost"),
  );
}

/**
 * Create a forbidden error response
 *
 * Convenience helper for permission/role errors.
 *
 * @param message - Optional custom message
 * @param request - The incoming request
 * @returns NextResponse with forbidden error payload
 *
 * @example
 * return forbiddenErrorResponse("Admin access required", request);
 */
export async function forbiddenErrorResponse(
  message?: string,
  request?: Request,
): Promise<NextResponse<ErrorResponse>> {
  return errorResponse(
    403,
    {
      code: ErrorCode.AUTH_FORBIDDEN,
      i18nKey: message ? undefined : "errors.forbidden",
      details: message ? { message } : undefined,
    },
    request ?? new Request("http://localhost"),
  );
}

/**
 * Create a bad request error response
 *
 * Convenience helper for malformed requests or invalid input.
 *
 * @param message - Optional custom message or i18n key
 * @param request - The incoming request
 * @returns NextResponse with bad request error payload
 *
 * @example
 * return badRequestErrorResponse("errors.validation.invalid_input", request);
 */
export async function badRequestErrorResponse(
  message?: string,
  request?: Request,
): Promise<NextResponse<ErrorResponse>> {
  return errorResponse(
    400,
    {
      code: ErrorCode.VALIDATION_ERROR,
      i18nKey: message?.startsWith("errors.") ? message : undefined,
      details: message && !message.startsWith("errors.")
        ? { message }
        : undefined,
    },
    request ?? new Request("http://localhost"),
  );
}

/**
 * Create an internal server error response
 *
 * Convenience helper for unexpected server errors.
 * Uses generic i18n message to avoid leaking internal details.
 *
 * @param error - The original error (logged but not exposed)
 * @param request - The incoming request
 * @returns NextResponse with internal server error payload
 *
 * @example
 * return internalErrorResponse(originalError, request);
 */
export async function internalErrorResponse(
  error: unknown,
  request?: Request,
): Promise<NextResponse<ErrorResponse>> {
  const endpoint =
    new URL(request?.url ?? "http://localhost").pathname ?? "unknown";
  const method = request?.method ?? "UNKNOWN";

  return handleApiError(error, request ?? new Request("http://localhost"), endpoint, method);
}

/**
 * Create an external service error response
 *
 * Convenience helper for third-party API/service failures.
 *
 * @param service - Name of the external service
 * @param details - Optional error details
 * @param request - The incoming request
 * @returns NextResponse with external service error payload
 *
 * @example
 * return externalServiceErrorResponse("Xendit", { reason: "timeout" }, request);
 */
export async function externalServiceErrorResponse(
  service: string,
  details?: unknown,
  request?: Request,
): Promise<NextResponse<ErrorResponse>> {
  return errorResponse(
    502,
    {
      code: ErrorCode.EXTERNAL_SERVICE_UNAVAILABLE,
      i18nKey: "errors.serverError",
      details: { service, ...(details && typeof details === 'object' ? { reason: details } : {}) },
    },
    request ?? new Request("http://localhost"),
  );
}
