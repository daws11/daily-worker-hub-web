/**
 * Rate Limiting Middleware for Daily Worker Hub
 *
 * Implements in-memory sliding window rate limiting with:
 * - IP-based and user-based rate limiting
 * - Configurable limits per endpoint type
 * - Environment-aware rate limits (dev/staging/prod)
 * - Admin bypass support
 * - Rate limit headers (X-RateLimit-*)
 * - Retry-After header on 429 responses
 */

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "@/lib/auth/get-server-session";
import { createClient } from "@/lib/supabase/server";

/**
 * Environment types for rate limit configuration
 */
export type Environment = "development" | "staging" | "production";

/**
 * Get current environment
 */
function getEnvironment(): Environment {
  const env = process.env.NODE_ENV;
  if (env === "production") return "production";
  if (env === "staging") return "staging";
  return "development";
}

/**
 * Environment-specific multiplier for rate limits
 * Development: Higher limits for testing
 * Staging: Moderate limits
 * Production: Strict limits for security
 */
const ENV_MULTIPLIERS: Record<Environment, number> = {
  development: 5, // 5x more relaxed for local testing
  staging: 2, // 2x more relaxed than production
  production: 1, // Standard limits
};

/**
 * Environment-aware rate limit overrides
 * These can be set via environment variables for fine-grained control
 */
interface EnvironmentOverrides {
  authMaxRequests?: number;
  authWindowMs?: number;
  apiAuthenticatedMaxRequests?: number;
  apiAuthenticatedWindowMs?: number;
  apiPublicMaxRequests?: number;
  apiPublicWindowMs?: number;
  paymentMaxRequests?: number;
  paymentWindowMs?: number;
}

/**
 * Parse environment variable overrides
 */
function getEnvironmentOverrides(): EnvironmentOverrides {
  return {
    // Auth limits
    authMaxRequests: process.env.RATE_LIMIT_AUTH_MAX_REQUESTS
      ? parseInt(process.env.RATE_LIMIT_AUTH_MAX_REQUESTS, 10)
      : undefined,
    authWindowMs: process.env.RATE_LIMIT_AUTH_WINDOW_MS
      ? parseInt(process.env.RATE_LIMIT_AUTH_WINDOW_MS, 10)
      : undefined,
    // Authenticated API limits
    apiAuthenticatedMaxRequests: process.env
      .RATE_LIMIT_API_AUTHENTICATED_MAX_REQUESTS
      ? parseInt(process.env.RATE_LIMIT_API_AUTHENTICATED_MAX_REQUESTS, 10)
      : undefined,
    apiAuthenticatedWindowMs: process.env.RATE_LIMIT_API_AUTHENTICATED_WINDOW_MS
      ? parseInt(process.env.RATE_LIMIT_API_AUTHENTICATED_WINDOW_MS, 10)
      : undefined,
    // Public API limits
    apiPublicMaxRequests: process.env.RATE_LIMIT_API_PUBLIC_MAX_REQUESTS
      ? parseInt(process.env.RATE_LIMIT_API_PUBLIC_MAX_REQUESTS, 10)
      : undefined,
    apiPublicWindowMs: process.env.RATE_LIMIT_API_PUBLIC_WINDOW_MS
      ? parseInt(process.env.RATE_LIMIT_API_PUBLIC_WINDOW_MS, 10)
      : undefined,
    // Payment limits
    paymentMaxRequests: process.env.RATE_LIMIT_PAYMENT_MAX_REQUESTS
      ? parseInt(process.env.RATE_LIMIT_PAYMENT_MAX_REQUESTS, 10)
      : undefined,
    paymentWindowMs: process.env.RATE_LIMIT_PAYMENT_WINDOW_MS
      ? parseInt(process.env.RATE_LIMIT_PAYMENT_WINDOW_MS, 10)
      : undefined,
  };
}

/**
 * Rate limit configuration types
 */
export type RateLimitType =
  | "auth"
  | "api-authenticated"
  | "api-public"
  | "payment";

export interface RateLimitConfig {
  /** Maximum requests allowed in the window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Type of rate limit for logging */
  type: RateLimitType;
  /** Message to return when rate limited */
  message?: string;
}

/**
 * Base rate limit configurations (production defaults)
 */
const BASE_RATE_LIMIT_CONFIGS: Record<RateLimitType, RateLimitConfig> = {
  auth: {
    maxRequests: 5,
    windowMs: 60 * 1000, // 5 requests per minute
    type: "auth",
    message:
      "Terlalu banyak percobaan login/register. Silakan coba lagi dalam beberapa menit.",
  },
  "api-authenticated": {
    maxRequests: 100,
    windowMs: 60 * 1000, // 100 requests per minute
    type: "api-authenticated",
    message: "Terlalu banyak permintaan. Silakan coba lagi nanti.",
  },
  "api-public": {
    maxRequests: 30,
    windowMs: 60 * 1000, // 30 requests per minute
    type: "api-public",
    message: "Terlalu banyak permintaan. Silakan coba lagi nanti.",
  },
  payment: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 10 requests per minute
    type: "payment",
    message:
      "Terlalu banyak permintaan pembayaran. Silakan coba lagi dalam beberapa menit.",
  },
};

/**
 * Apply environment multiplier to a base value
 */
function applyEnvironmentMultiplier(
  baseValue: number,
  multiplier: number,
): number {
  return Math.max(1, Math.round(baseValue * multiplier));
}

/**
 * Get environment-aware rate limit configurations
 * Applies environment multipliers and allows environment variable overrides
 */
function buildRateLimitConfigs(): Record<RateLimitType, RateLimitConfig> {
  const env = getEnvironment();
  const multiplier = ENV_MULTIPLIERS[env];
  const overrides = getEnvironmentOverrides();

  return {
    auth: {
      maxRequests:
        overrides.authMaxRequests ??
        applyEnvironmentMultiplier(BASE_RATE_LIMIT_CONFIGS.auth.maxRequests, multiplier),
      windowMs: overrides.authWindowMs ?? BASE_RATE_LIMIT_CONFIGS.auth.windowMs,
      type: "auth",
      message:
        "Terlalu banyak percobaan login/register. Silakan coba lagi dalam beberapa menit.",
    },
    "api-authenticated": {
      maxRequests:
        overrides.apiAuthenticatedMaxRequests ??
        applyEnvironmentMultiplier(
          BASE_RATE_LIMIT_CONFIGS["api-authenticated"].maxRequests,
          multiplier,
        ),
      windowMs:
        overrides.apiAuthenticatedWindowMs ??
        BASE_RATE_LIMIT_CONFIGS["api-authenticated"].windowMs,
      type: "api-authenticated",
      message: "Terlalu banyak permintaan. Silakan coba lagi nanti.",
    },
    "api-public": {
      maxRequests:
        overrides.apiPublicMaxRequests ??
        applyEnvironmentMultiplier(
          BASE_RATE_LIMIT_CONFIGS["api-public"].maxRequests,
          multiplier,
        ),
      windowMs:
        overrides.apiPublicWindowMs ?? BASE_RATE_LIMIT_CONFIGS["api-public"].windowMs,
      type: "api-public",
      message: "Terlalu banyak permintaan. Silakan coba lagi nanti.",
    },
    payment: {
      maxRequests:
        overrides.paymentMaxRequests ??
        applyEnvironmentMultiplier(
          BASE_RATE_LIMIT_CONFIGS.payment.maxRequests,
          multiplier,
        ),
      windowMs: overrides.paymentWindowMs ?? BASE_RATE_LIMIT_CONFIGS.payment.windowMs,
      type: "payment",
      message:
        "Terlalu banyak permintaan pembayaran. Silakan coba lagi dalam beberapa menit.",
    },
  };
}

/**
 * Predefined rate limit configurations (environment-aware)
 */
export const RATE_LIMIT_CONFIGS: Record<RateLimitType, RateLimitConfig> =
  buildRateLimitConfigs();

/**
 * Get current environment information
 * Useful for debugging and logging
 */
export function getRateLimitEnvironment(): {
  environment: Environment;
  multiplier: number;
  configs: Record<RateLimitType, RateLimitConfig>;
} {
  return {
    environment: getEnvironment(),
    multiplier: ENV_MULTIPLIERS[getEnvironment()],
    configs: RATE_LIMIT_CONFIGS,
  };
}

/**
 * Request record for tracking rate limits
 */
interface RequestRecord {
  count: number;
  resetTime: number;
}

/**
 * In-memory store for rate limit tracking
 * Key format: `${identifier}:${type}`
 * Exported for admin metrics access
 */
export const rateLimitStore = new Map<string, RequestRecord>();

/**
 * Clean up expired entries periodically (every 5 minutes)
 */
setInterval(
  () => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
      if (now > record.resetTime) {
        rateLimitStore.delete(key);
      }
    }
  },
  5 * 60 * 1000,
);

/**
 * Get client IP address from request
 */
function getClientIP(request: NextRequest): string {
  // Check various headers for IP address
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  const cfIP = request.headers.get("cf-connecting-ip"); // Cloudflare

  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(",")[0].trim();
  }

  if (realIP) {
    return realIP.trim();
  }

  if (cfIP) {
    return cfIP.trim();
  }

  // Fallback to a default (shouldn't happen in production)
  return "unknown";
}

/**
 * Check if user has admin role (bypass rate limits)
 */
async function isAdminUser(): Promise<boolean> {
  try {
    const session = await getServerSession();

    if (!session?.user?.id) {
      return false;
    }

    const supabase = await createClient();

    const { data: user, error } = await supabase
      .from("users")
      .select("role")
      .eq("id", session.user.id)
      .single();

    if (error || !user) {
      return false;
    }

    return (user as { role: string }).role === "admin";
  } catch {
    return false;
  }
}

/**
 * Sliding window rate limit check
 * Returns remaining requests and reset time
 */
function checkRateLimit(
  identifier: string,
  config: RateLimitConfig,
): {
  allowed: boolean;
  remaining: number;
  resetTime: number;
  retryAfter: number;
} {
  const now = Date.now();
  const key = `${identifier}:${config.type}`;

  const record = rateLimitStore.get(key);

  if (!record || now > record.resetTime) {
    // No record or window expired - create new entry
    const newRecord: RequestRecord = {
      count: 1,
      resetTime: now + config.windowMs,
    };
    rateLimitStore.set(key, newRecord);

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetTime: newRecord.resetTime,
      retryAfter: 0,
    };
  }

  // Window is still active
  if (record.count < config.maxRequests) {
    // Increment count
    record.count++;
    rateLimitStore.set(key, record);

    return {
      allowed: true,
      remaining: config.maxRequests - record.count,
      resetTime: record.resetTime,
      retryAfter: 0,
    };
  }

  // Rate limit exceeded
  const retryAfter = Math.ceil((record.resetTime - now) / 1000); // Convert to seconds

  return {
    allowed: false,
    remaining: 0,
    resetTime: record.resetTime,
    retryAfter,
  };
}

/**
 * Rate limit response headers
 */
interface RateLimitHeaders {
  "X-RateLimit-Limit": string;
  "X-RateLimit-Remaining": string;
  "X-RateLimit-Reset": string;
  "Retry-After"?: string;
}

/**
 * Create rate limit headers
 */
function createRateLimitHeaders(
  config: RateLimitConfig,
  remaining: number,
  resetTime: number,
  retryAfter?: number,
): RateLimitHeaders {
  const headers: RateLimitHeaders = {
    "X-RateLimit-Limit": config.maxRequests.toString(),
    "X-RateLimit-Remaining": Math.max(0, remaining).toString(),
    "X-RateLimit-Reset": Math.ceil(resetTime / 1000).toString(), // Unix timestamp in seconds
  };

  if (retryAfter && retryAfter > 0) {
    headers["Retry-After"] = retryAfter.toString();
  }

  return headers;
}

/**
 * Options for withRateLimit middleware
 */
export interface RateLimitOptions {
  /** Rate limit type (uses predefined config) */
  type?: RateLimitType;
  /** Custom rate limit config (overrides type) */
  config?: RateLimitConfig;
  /** Whether to use user-based rate limiting (default: true for authenticated routes) */
  userBased?: boolean;
  /** Whether to also apply IP-based rate limiting alongside user-based */
  alsoIpBased?: boolean;
  /** Skip rate limiting for admin users (default: true) */
  skipAdmin?: boolean;
  /** Custom key prefix for rate limit identifier */
  keyPrefix?: string;
  /** HTTP methods to apply rate limiting to (default: all) */
  methods?: ("GET" | "POST" | "PUT" | "DELETE" | "PATCH")[];
}

/**
 * Extract user ID from session for rate limiting
 */
async function getUserId(): Promise<string | null> {
  try {
    const session = await getServerSession();
    return session?.user?.id || null;
  } catch {
    return null;
  }
}

/**
 * Rate limiting middleware wrapper
 *
 * Usage:
 * ```typescript
 * export const POST = withRateLimit(
 *   async (request: NextRequest) => {
 *     // Your handler code
 *   },
 *   { type: 'payment' }
 * )
 * ```
 */
export function withRateLimit<T extends NextRequest>(
  handler: (request: T) => Promise<NextResponse>,
  options: RateLimitOptions = {},
): (request: T) => Promise<NextResponse> {
  const {
    type = "api-public",
    config,
    userBased = true,
    alsoIpBased = false,
    skipAdmin = true,
    keyPrefix = "",
    methods,
  } = options;

  const rateLimitConfig = config || RATE_LIMIT_CONFIGS[type];

  return async (request: T): Promise<NextResponse> => {
    // Check if method should be rate limited
    if (methods && methods.length > 0) {
      const method = request.method.toUpperCase() as (typeof methods)[number];
      if (!methods.includes(method)) {
        return handler(request);
      }
    }

    // Check for admin bypass
    if (skipAdmin) {
      const isAdmin = await isAdminUser();
      if (isAdmin) {
        // Add rate limit headers but don't enforce
        const ip = getClientIP(request);
        const headers = createRateLimitHeaders(
          rateLimitConfig,
          rateLimitConfig.maxRequests,
          Date.now() + rateLimitConfig.windowMs,
        );
        const response = await handler(request);

        // Add headers to response
        Object.entries(headers).forEach(([key, value]) => {
          response.headers.set(key, value);
        });

        return response;
      }
    }

    const ip = getClientIP(request);
    const userId = userBased ? await getUserId() : null;

    // Build identifier
    // Priority: userId > ip
    let identifier: string;

    if (userId) {
      identifier = keyPrefix ? `${keyPrefix}:user:${userId}` : `user:${userId}`;
    } else {
      identifier = keyPrefix ? `${keyPrefix}:ip:${ip}` : `ip:${ip}`;
    }

    // Check rate limit
    const result = checkRateLimit(identifier, rateLimitConfig);

    // If also IP-based, check that too (stricter limit wins)
    if (alsoIpBased && userId) {
      const ipIdentifier = keyPrefix ? `${keyPrefix}:ip:${ip}` : `ip:${ip}`;
      const ipResult = checkRateLimit(ipIdentifier, rateLimitConfig);

      // Use the stricter result
      if (!ipResult.allowed || ipResult.remaining < result.remaining) {
        Object.assign(result, ipResult);
      }
    }

    // If rate limited, return 429
    if (!result.allowed) {
      const headers = createRateLimitHeaders(
        rateLimitConfig,
        result.remaining,
        result.resetTime,
        result.retryAfter,
      );

      return NextResponse.json(
        {
          error: rateLimitConfig.message || "Too many requests",
          retryAfter: result.retryAfter,
        },
        {
          status: 429,
          headers: headers as unknown as Record<string, string>,
        },
      );
    }

    // Process request and add rate limit headers to response
    const response = await handler(request);

    // Add rate limit headers
    const headers = createRateLimitHeaders(
      rateLimitConfig,
      result.remaining,
      result.resetTime,
    );

    Object.entries(headers).forEach(([key, value]) => {
      response.headers.set(key, value);
    });

    return response;
  };
}

/**
 * Higher-order function for rate limiting specific HTTP methods
 *
 * Usage:
 * ```typescript
 * export const POST = withRateLimitForMethod(
 *   async (request) => { ... },
 *   { type: 'payment' },
 *   ['POST']
 * )
 * ```
 */
export function withRateLimitForMethod<T extends NextRequest>(
  handler: (request: T) => Promise<NextResponse>,
  options: RateLimitOptions = {},
  methods: ("GET" | "POST" | "PUT" | "DELETE" | "PATCH")[] = [
    "POST",
    "PUT",
    "DELETE",
    "PATCH",
  ],
): (request: T) => Promise<NextResponse> {
  return withRateLimit(handler, { ...options, methods });
}

/**
 * Clear rate limit for a specific identifier (useful for testing)
 */
export function clearRateLimit(identifier: string, type: RateLimitType): void {
  const key = `${identifier}:${type}`;
  rateLimitStore.delete(key);
}

/**
 * Clear all rate limits (useful for testing)
 */
export function clearAllRateLimits(): void {
  rateLimitStore.clear();
}

/**
 * Get current rate limit stats for an identifier (useful for debugging)
 */
export function getRateLimitStats(
  identifier: string,
  type: RateLimitType,
): RequestRecord | undefined {
  const key = `${identifier}:${type}`;
  return rateLimitStore.get(key);
}
