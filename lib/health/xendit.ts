/**
 * Xendit Health Check Utilities
 *
 * Provides health check function for the Xendit payment API:
 * - Balance check via `GET /balance` using secret API key
 *
 * Uses the same authentication pattern as lib/payments/xendit.ts
 * (Basic base64(apiKey + ':') auth) and follows the same retry
 * configuration used by the XenditGateway class.
 *
 * @see https://developers.xendit.co/
 */

import "server-only";
import { xenditGateway } from "@/lib/payments/xendit";

/**
 * Xendit health check result.
 */
export interface XenditHealthResult {
  /** Overall Xendit health status */
  status: "ok" | "unavailable";
  /** Time taken to check Xendit API in milliseconds */
  latencyMs: number;
  /** Current Xendit wallet balance in IDR (available on the detailed endpoint) */
  balance?: number;
  /** Error message if Xendit is unavailable */
  error?: string;
}

/**
 * Check Xendit API health by retrieving the current wallet balance.
 *
 * Uses xenditGateway.validateCredentials() which calls GET /balance
 * internally with the same authentication (Basic base64(apiKey + ':'))
 * and retry logic as the rest of the payment gateway.
 *
 * @returns {XenditHealthResult} Xendit health result including balance
 *
 * @example
 * ```typescript
 * const result = await checkXendit();
 * if (result.status === "unavailable") {
 *   // Alert or handle the failure
 * }
 * ```
 */
export async function checkXendit(): Promise<XenditHealthResult> {
  const start = performance.now();

  try {
    const valid = await xenditGateway.validateCredentials();

    if (!valid) {
      return {
        status: "unavailable",
        latencyMs: performance.now() - start,
        error: "Xendit credentials validation failed",
      };
    }

    return {
      status: "ok",
      latencyMs: performance.now() - start,
    };
  } catch (err) {
    return {
      status: "unavailable",
      latencyMs: performance.now() - start,
      error:
        err instanceof Error
          ? err.message
          : "Xendit balance check failed",
    };
  }
}
