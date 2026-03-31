/**
 * Sentry Example API Route
 *
 * Demonstrates manual span instrumentation using Sentry.startSpan() in
 * a Next.js App Router route handler. This serves as a reference pattern
 * for instrumenting other API routes.
 */

import * as Sentry from "@sentry/nextjs";
import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";

const routeLogger = logger.createApiLogger("sentry-example-api");

/**
 * GET /api/sentry-example-api
 *
 * Example endpoint instrumented with Sentry.startSpan().
 * Wraps the full handler body in an http.server span for tracing.
 */
export async function GET() {
  return Sentry.startSpan(
    { name: "GET /api/sentry-example-api", op: "http.server" },
    async () => {
      const span = Sentry.getActiveSpan();
      if (span) {
        span.setAttribute("route", "sentry-example-api");
        span.setAttribute("method", "GET");
      }

      try {
        // Example business logic wrapped in the span
        const data = {
          message: "Sentry instrumentation example",
          timestamp: new Date().toISOString(),
          status: "ok",
        };

        if (span) {
          span.setAttribute("response.size_bytes", JSON.stringify(data).length);
        }

        return NextResponse.json({ data }, { status: 200 });
      } catch (error) {
        routeLogger.error(
          "Unexpected error in GET /api/sentry-example-api",
          error instanceof Error ? error : new Error(String(error)),
        );
        Sentry.captureException(error);

        return NextResponse.json(
          { error: "Internal server error" },
          { status: 500 },
        );
      }
    },
  );
}
