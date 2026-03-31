import { NextResponse } from "next/server";
import { logger } from "@/lib/logger";
import { getHealthStatus } from "@/lib/health/index";
import { sendTextEmail } from "@/lib/notifications/email";

const routeLogger = logger.createApiLogger("cron/health-check");

/**
 * Internal cron job to check all subsystems and fire alerts on failure.
 * Runs every 5 minutes via Vercel Cron (configured in vercel.json).
 *
 * Security: Requires CRON_SECRET Bearer header for authentication.
 *
 * Alerting behaviour:
 * - BETTERSTACK_HEARTBEAT_URL — POSTed on every run (success or failure).
 *   This confirms to Better Stack that the scheduled task fired.
 *   Skipped if not configured (fail open).
 * - ALERT_EMAIL — sent via Resend only when a critical service is down.
 *   Skipped if ALERT_EMAIL or RESEND_API_KEY is not configured.
 * - Deployment skip — if X-Vercel-Deployment header is present (set by Vercel
 *   during rolling deploys), skip all alerting to avoid false positives.
 *
 * IMPORTANT: Set CRON_SECRET environment variable in Vercel dashboard.
 * Example: openssl rand -base64 32
 */
export async function POST(request: Request) {
  const { startTime, requestId } = logger.requestStart(request, {
    route: "cron/health-check",
  });

  try {
    // --- CRON_SECRET authentication ---
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      routeLogger.warn("Unauthorized cron access attempt", { requestId });
      logger.requestError(request, new Error("Unauthorized"), 401, startTime, {
        requestId,
      });

      return NextResponse.json(
        { success: false, error: "Unauthorized" },
        { status: 401 },
      );
    }

    // --- Deployment detection: skip alerting during rolling deploys ---
    const isVercelDeployment = request.headers.has("x-vercel-deployment-url");

    routeLogger.info("Starting health-check cron job", {
      requestId,
      isVercelDeployment,
    });

    // Audit log for cron job start
    logger.audit("cron_job_started", {
      requestId,
      jobName: "health_check",
      isVercelDeployment,
    });

    // --- Run all subsystem health checks in parallel ---
    const health = await getHealthStatus();

    const isUnhealthy = health.status === "unhealthy";

    // --- Fire Better Stack Heartbeat (every run) ---
    await fireBetterStackHeartbeat(health.status, requestId, isVercelDeployment);

    // --- Send email alert only on critical failure ---
    if (isUnhealthy && !isVercelDeployment) {
      await sendAlertEmail(health, requestId);
    }

    // --- Audit log for cron job completion ---
    logger.audit("cron_job_completed", {
      requestId,
      jobName: "health_check",
      overallStatus: health.status,
      services: {
        supabase: health.services.supabase.status,
        xendit: health.services.xendit.status,
        redis: health.services.redis.status,
      },
      responseTimeMs: health.responseTimeMs,
    });

    routeLogger.info("Health-check cron job completed", {
      requestId,
      overallStatus: health.status,
      supabaseStatus: health.services.supabase.status,
      xenditStatus: health.services.xendit.status,
      redisStatus: health.services.redis.status,
      responseTimeMs: health.responseTimeMs,
    });

    logger.requestSuccess(request, { status: 200 }, startTime, { requestId });

    return NextResponse.json({
      success: true,
      status: health.status,
      timestamp: health.timestamp,
      responseTimeMs: health.responseTimeMs,
      alerted: isUnhealthy,
    });
  } catch (error) {
    routeLogger.error("Unexpected error in health-check cron", error, {
      requestId,
    });

    logger.audit("cron_job_failed", {
      requestId,
      jobName: "health_check",
      error: error instanceof Error ? error.message : "Unknown error",
    });

    logger.requestError(request, error, 500, startTime, { requestId });

    return NextResponse.json(
      {
        success: false,
        error: "Internal server error during health check",
      },
      { status: 500 },
    );
  }
}

/**
 * Fire Better Stack Heartbeat.
 *
 * Heartbeat URL format: https://uptime.betterstack.com/api/v1/heartbeat/<TOKEN>
 * No Authorization header is needed — the token is embedded in the URL.
 *
 * Better Stack Heartbeat monitors confirm that this scheduled task ran.
 * We POST on every run (both success and failure) so that Better Stack
 * detects a missed schedule if this cron stops firing.
 *
 * @param status   - Overall health status from getHealthStatus()
 * @param requestId - Request context ID for logging
 * @param isVercelDeployment - Whether Vercel is currently deploying
 */
async function fireBetterStackHeartbeat(
  status: "ok" | "degraded" | "unhealthy",
  requestId: string,
  isVercelDeployment: boolean,
): Promise<void> {
  const heartbeatUrl = process.env.BETTERSTACK_HEARTBEAT_URL;

  if (!heartbeatUrl) {
    routeLogger.warn("BETTERSTACK_HEARTBEAT_URL not configured — skipping heartbeat", {
      requestId,
    });
    return;
  }

  if (isVercelDeployment) {
    routeLogger.info("Skipping Better Stack heartbeat during deployment", {
      requestId,
    });
    return;
  }

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000); // 10s timeout for heartbeat

    const response = await fetch(heartbeatUrl, {
      method: "POST",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      routeLogger.info("Better Stack heartbeat fired successfully", {
        requestId,
        status,
      });
    } else {
      routeLogger.warn("Better Stack heartbeat returned non-OK status", {
        requestId,
        statusCode: response.status,
      });
    }
  } catch (error) {
    // Fail open — heartbeat failure should not cause the cron to error
    routeLogger.error(
      "Failed to fire Better Stack heartbeat",
      error,
      { requestId },
    );
  }
}

/**
 * Send an alert email when a critical service is down.
 *
 * Skipped if ALERT_EMAIL or RESEND_API_KEY is not configured.
 * Uses the existing Resend email infrastructure.
 *
 * @param health    - Full health status result from getHealthStatus()
 * @param requestId - Request context ID for logging
 */
async function sendAlertEmail(
  health: Awaited<ReturnType<typeof getHealthStatus>>,
  requestId: string,
): Promise<void> {
  const alertEmail = process.env.ALERT_EMAIL;

  if (!alertEmail) {
    routeLogger.warn("ALERT_EMAIL not configured — skipping email alert", {
      requestId,
    });
    return;
  }

  const supabase = health.services.supabase;
  const xendit = health.services.xendit;
  const redis = health.services.redis;

  const failures: string[] = [];
  if (supabase.status === "unavailable") failures.push(`Supabase Database: ${supabase.database.error || supabase.error || "unavailable"}`);
  if (supabase.auth.status === "unavailable") failures.push(`Supabase Auth: ${supabase.auth.error || "unavailable"}`);
  if (xendit.status === "unavailable") failures.push(`Xendit: ${xendit.error || "unavailable"}`);
  if (redis.status === "unavailable") failures.push(`Redis: ${redis.error || "unavailable"}`);

  const subject = `[Alert] Daily Worker Hub — System Unhealthy (${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })})`;

  const text = [
    `Daily Worker Hub System Alert`,
    `================================`,
    ``,
    `Time: ${new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" })}`,
    `Request ID: ${requestId}`,
    ``,
    `Overall Status: ${health.status}`,
    ``,
    `Failed Services:`,
    ...failures.map((f) => `  - ${f}`),
    ``,
    `Response Time: ${health.responseTimeMs.toFixed(2)}ms`,
    ``,
    `---`,
    `This is an automated alert from the Daily Worker Hub monitoring system.`,
    `Please refer to docs/INCIDENT_RESPONSE.md for escalation procedures.`,
  ].join("\n");

  const result = await sendTextEmail(alertEmail, subject, text);

  if (result.success) {
    routeLogger.info("Alert email sent successfully", {
      requestId,
      alertEmail,
      emailId: result.data?.id,
    });
  } else {
    routeLogger.error(
      "Failed to send alert email",
      new Error(result.error || "Email send failed"),
      { requestId, alertEmail },
    );
  }
}
