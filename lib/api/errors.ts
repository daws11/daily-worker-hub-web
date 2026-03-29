/**
 * API Error Types and Codes
 *
 * Provides a unified set of typed error codes and an ApiError class
 * for consistent error handling across all API routes in the
 * Daily Worker Hub application.
 */

import { NextResponse } from "next/server";

/**
 * HTTP status codes used in API responses
 */
export type HttpStatusCode =
  | 400 // Bad Request
  | 401 // Unauthorized
  | 403 // Forbidden
  | 404 // Not Found
  | 405 // Method Not Allowed
  | 409 // Conflict
  | 410 // Gone
  | 422 // Unprocessable Entity
  | 423 // Locked
  | 429 // Too Many Requests
  | 500 // Internal Server Error
  | 501 // Not Implemented
  | 502 // Bad Gateway
  | 503 // Service Unavailable
  | 504; // Gateway Timeout

/**
 * Standardized API error codes used throughout the application.
 *
 * These codes are used in the `code` field of ErrorResponse to provide
 * a stable, machine-readable identifier for each error type.
 *
 * @example
 * // In an API route handler
 * return createApiError("RESOURCE_NOT_FOUND", 404, "Job not found");
 */
export const ErrorCode = {
  // Authentication & Authorization (AUTH_*)
  AUTH_SESSION_EXPIRED: "AUTH_SESSION_EXPIRED",
  AUTH_TOKEN_INVALID: "AUTH_TOKEN_INVALID",
  AUTH_UNAUTHORIZED: "AUTH_UNAUTHORIZED",
  AUTH_FORBIDDEN: "AUTH_FORBIDDEN",
  AUTH_USER_NOT_FOUND: "AUTH_USER_NOT_FOUND",
  AUTH_PROFILE_INCOMPLETE: "AUTH_PROFILE_INCOMPLETE",

  // Validation Errors (VALIDATION_*)
  VALIDATION_ERROR: "VALIDATION_ERROR",
  VALIDATION_REQUIRED_FIELD_MISSING: "VALIDATION_REQUIRED_FIELD_MISSING",
  VALIDATION_INVALID_FORMAT: "VALIDATION_INVALID_FORMAT",
  VALIDATION_INVALID_TYPE: "VALIDATION_INVALID_TYPE",
  VALIDATION_OUT_OF_RANGE: "VALIDATION_OUT_OF_RANGE",
  VALIDATION_JSON_PARSE_ERROR: "VALIDATION_JSON_PARSE_ERROR",

  // Resource Errors (RESOURCE_*)
  RESOURCE_NOT_FOUND: "RESOURCE_NOT_FOUND",
  RESOURCE_ALREADY_EXISTS: "RESOURCE_ALREADY_EXISTS",
  RESOURCE_DELETED: "RESOURCE_DELETED",
  RESOURCE_LOCKED: "RESOURCE_LOCKED",

  // Database & Server Errors (DB_*, SERVER_*)
  DB_CONNECTION_ERROR: "DB_CONNECTION_ERROR",
  DB_QUERY_ERROR: "DB_QUERY_ERROR",
  DB_CONSTRAINT_VIOLATION: "DB_CONSTRAINT_VIOLATION",
  SERVER_INTERNAL_ERROR: "SERVER_INTERNAL_ERROR",
  SERVER_UNAVAILABLE: "SERVER_UNAVAILABLE",

  // Business Logic Errors (BUSINESS_*)
  BUSINESS_INSUFFICIENT_BALANCE: "BUSINESS_INSUFFICIENT_BALANCE",
  BUSINESS_INVALID_STATUS_TRANSITION: "BUSINESS_INVALID_STATUS_TRANSITION",
  BUSINESS_DUPLICATE_ENTRY: "BUSINESS_DUPLICATE_ENTRY",
  BUSINESS_RATE_LIMIT_EXCEEDED: "BUSINESS_RATE_LIMIT_EXCEEDED",

  // Payment Errors (PAYMENT_*)
  PAYMENT_CREATION_FAILED: "PAYMENT_CREATION_FAILED",
  PAYMENT_VERIFICATION_FAILED: "PAYMENT_VERIFICATION_FAILED",
  PAYMENT_WITHDRAWAL_FAILED: "PAYMENT_WITHDRAWAL_FAILED",
  PAYMENT_CALLBACK_INVALID: "PAYMENT_CALLBACK_INVALID",
  PAYMENT_AMOUNT_MISMATCH: "PAYMENT_AMOUNT_MISMATCH",

  // External Service Errors (EXTERNAL_*)
  EXTERNAL_SERVICE_UNAVAILABLE: "EXTERNAL_SERVICE_UNAVAILABLE",
  EXTERNAL_SERVICE_TIMEOUT: "EXTERNAL_SERVICE_TIMEOUT",
  EXTERNAL_SERVICE_ERROR: "EXTERNAL_SERVICE_ERROR",

  // Generic Errors (ERROR_*)
  ERROR_BAD_REQUEST: "ERROR_BAD_REQUEST",
  ERROR_NOT_IMPLEMENTED: "ERROR_NOT_IMPLEMENTED",
  ERROR_METHOD_NOT_ALLOWED: "ERROR_METHOD_NOT_ALLOWED",
} as const;

/**
 * Type representing all possible error codes
 */
export type ErrorCodeType = (typeof ErrorCode)[keyof typeof ErrorCode];

/**
 * Map of ErrorCode to their default HTTP status codes
 */
const DEFAULT_STATUS_MAP: Record<ErrorCodeType, HttpStatusCode> = {
  // Authentication & Authorization
  [ErrorCode.AUTH_SESSION_EXPIRED]: 401,
  [ErrorCode.AUTH_TOKEN_INVALID]: 401,
  [ErrorCode.AUTH_UNAUTHORIZED]: 401,
  [ErrorCode.AUTH_FORBIDDEN]: 403,
  [ErrorCode.AUTH_USER_NOT_FOUND]: 404,
  [ErrorCode.AUTH_PROFILE_INCOMPLETE]: 422,

  // Validation Errors
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.VALIDATION_REQUIRED_FIELD_MISSING]: 400,
  [ErrorCode.VALIDATION_INVALID_FORMAT]: 400,
  [ErrorCode.VALIDATION_INVALID_TYPE]: 400,
  [ErrorCode.VALIDATION_OUT_OF_RANGE]: 400,
  [ErrorCode.VALIDATION_JSON_PARSE_ERROR]: 400,

  // Resource Errors
  [ErrorCode.RESOURCE_NOT_FOUND]: 404,
  [ErrorCode.RESOURCE_ALREADY_EXISTS]: 409,
  [ErrorCode.RESOURCE_DELETED]: 410,
  [ErrorCode.RESOURCE_LOCKED]: 423,

  // Database & Server Errors
  [ErrorCode.DB_CONNECTION_ERROR]: 503,
  [ErrorCode.DB_QUERY_ERROR]: 500,
  [ErrorCode.DB_CONSTRAINT_VIOLATION]: 409,
  [ErrorCode.SERVER_INTERNAL_ERROR]: 500,
  [ErrorCode.SERVER_UNAVAILABLE]: 503,

  // Business Logic Errors
  [ErrorCode.BUSINESS_INSUFFICIENT_BALANCE]: 422,
  [ErrorCode.BUSINESS_INVALID_STATUS_TRANSITION]: 422,
  [ErrorCode.BUSINESS_DUPLICATE_ENTRY]: 409,
  [ErrorCode.BUSINESS_RATE_LIMIT_EXCEEDED]: 429,

  // Payment Errors
  [ErrorCode.PAYMENT_CREATION_FAILED]: 502,
  [ErrorCode.PAYMENT_VERIFICATION_FAILED]: 400,
  [ErrorCode.PAYMENT_WITHDRAWAL_FAILED]: 502,
  [ErrorCode.PAYMENT_CALLBACK_INVALID]: 400,
  [ErrorCode.PAYMENT_AMOUNT_MISMATCH]: 400,

  // External Service Errors
  [ErrorCode.EXTERNAL_SERVICE_UNAVAILABLE]: 502,
  [ErrorCode.EXTERNAL_SERVICE_TIMEOUT]: 504,
  [ErrorCode.EXTERNAL_SERVICE_ERROR]: 502,

  // Generic Errors
  [ErrorCode.ERROR_BAD_REQUEST]: 400,
  [ErrorCode.ERROR_NOT_IMPLEMENTED]: 501,
  [ErrorCode.ERROR_METHOD_NOT_ALLOWED]: 405,
};

/**
 * Structured API error response object
 *
 * This is the standard shape returned by all API routes when an error occurs.
 */
export interface ErrorResponse {
  error: {
    /** Machine-readable error code */
    code: ErrorCodeType | string;
    /** Human-readable error message (may be i18n key) */
    message: string;
    /** Optional additional error details */
    details?: unknown;
    /** Request trace ID for debugging (if available) */
    traceId?: string;
  };
}

/**
 * Additional context that can be attached to an ApiError
 */
export interface ApiErrorContext {
  /** Original error that triggered this ApiError */
  cause?: unknown;
  /** Additional details about the error */
  details?: unknown;
  /** The API endpoint where the error occurred */
  endpoint?: string;
  /** HTTP method used in the request */
  method?: string;
  /** i18n translation key for the error message */
  i18nKey?: string;
}

/**
 * Custom error class for API errors
 *
 * Extends the built-in Error class with additional properties for
 * structured error responses. Use this instead of throwing generic
 * Error objects in API routes.
 *
 * @example
 * throw new ApiError("RESOURCE_NOT_FOUND", "Job with ID 123 not found");
 *
 * @example
 * throw new ApiError("VALIDATION_ERROR", "Invalid email format", {
 *   cause: originalError,
 *   details: { field: "email", value: "not-an-email" }
 * });
 */
export class ApiError extends Error {
  /** Machine-readable error code */
  public readonly code: ErrorCodeType | string;
  /** HTTP status code */
  public readonly statusCode: HttpStatusCode;
  /** Additional error details */
  public readonly details?: unknown;
  /** Original error that caused this error */
  public readonly cause?: unknown;

  constructor(
    code: ErrorCodeType | string,
    message: string,
    statusCode?: HttpStatusCode,
    context?: ApiErrorContext,
  ) {
    super(message, { cause: context?.cause });

    this.name = "ApiError";
    this.code = code;
    this.statusCode =
      statusCode ?? DEFAULT_STATUS_MAP[code as ErrorCodeType] ?? 500;
    this.details = context?.details ?? context?.cause;

    // Maintains proper stack trace in V8 environments
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /**
   * Convert the error to a structured ErrorResponse object
   */
  toResponse(): ErrorResponse {
    const response: ErrorResponse = {
      error: {
        code: this.code,
        message: this.message,
      },
    };

    if (this.details) {
      response.error.details = this.details;
    }

    return response;
  }

  /**
   * Create a NextResponse with the error payload and appropriate status code
   */
  toNextResponse(): NextResponse {
    return NextResponse.json(this.toResponse(), {
      status: this.statusCode,
    });
  }
}

/**
 * Check if an unknown value is an ApiError instance
 */
export function isApiError(error: unknown): error is ApiError {
  return (
    error instanceof ApiError ||
    (error instanceof Error && error.name === "ApiError")
  );
}

/**
 * Convert any error to an ApiError instance
 *
 * Useful in catch blocks to normalize unknown errors to ApiError.
 *
 * @param error - The error to convert
 * @param defaultCode - Default error code if conversion is needed
 * @param defaultMessage - Default message if conversion is needed
 *
 * @example
 * try {
 *   await riskyOperation();
 * } catch (error) {
 *   throw toApiError(error, "SERVER_INTERNAL_ERROR", "An unexpected error occurred");
 * }
 */
export function toApiError(
  error: unknown,
  defaultCode: ErrorCodeType | string = ErrorCode.SERVER_INTERNAL_ERROR,
  defaultMessage = "An unexpected error occurred",
): ApiError {
  if (isApiError(error)) {
    return error;
  }

  if (error instanceof Error) {
    return new ApiError(
      defaultCode,
      error.message || defaultMessage,
      undefined,
      { cause: error },
    );
  }

  return new ApiError(defaultCode, defaultMessage);
}
