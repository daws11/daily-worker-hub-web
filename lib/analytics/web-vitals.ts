/**
 * Core Web Vitals tracking utilities using the `web-vitals` library.
 *
 * Tracks LCP, FID (via INP), CLS, and INP metrics and reports them
 * to Vercel Analytics. All functions are client-side only and respect
 * the user's Do Not Track preference.
 *
 * @see https://web.dev/articles/vitals
 * @see https://vercel.com/docs/concepts/analytics
 */

import { onCLS, onINP, onLCP } from "web-vitals";

// ---------------------------------------------------------------------------
// Result Types
// ---------------------------------------------------------------------------

export type WebVitalsResult = {
  success: boolean;
  error?: string;
};

export type MetricName = "LCP" | "INP" | "CLS";

export type MetricReport = {
  name: MetricName;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  id: string;
  delta: number;
  navigationType: string;
};

export type TrackWebVitalsResult = {
  success: boolean;
  error?: string;
  metrics?: MetricReport[];
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Guard: only fire web vitals tracking in browser context.
 * Returns false if called in a server/SSR environment.
 */
function canTrack(): { allowed: boolean; error?: string } {
  if (typeof window === "undefined") {
    return { allowed: false, error: "Cannot track web vitals in server context" };
  }
  if (
    navigator.doNotTrack === "1" ||
    (window as Window & { doNotTrack?: string }).doNotTrack === "1"
  ) {
    return { allowed: false, error: "User has Do Not Track enabled" };
  }
  return { allowed: true };
}

/**
 * Normalize a web-vitals metric into a flat MetricReport object.
 * Extracts only the fields we send to analytics — no entries or PII.
 */
function normalizeMetric(metric: {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  id: string;
  delta: number;
  navigationType?: string;
}): MetricReport {
  return {
    name: metric.name as MetricName,
    value: metric.value,
    rating: metric.rating,
    id: metric.id,
    delta: metric.delta,
    navigationType: metric.navigationType ?? "navigate",
  };
}

// ---------------------------------------------------------------------------
// Core Web Vitals tracking
// ---------------------------------------------------------------------------

/**
 * LCP — Largest Contentful Paint
 *
 * Measures loading performance. Good: ≤ 2500 ms, Needs improvement: ≤ 4000 ms,
 * Poor: > 4000 ms.
 *
 * @see https://web.dev/articles/lcp
 */
function trackLCP(): Promise<MetricReport> {
  return new Promise((resolve) => {
    onLCP(
      (metric) => {
        resolve(normalizeMetric(metric));
      },
      { reportAllChanges: false },
    );
  });
}

/**
 * INP — Interaction to Next Paint (replaces FID in modern browsers)
 *
 * Measures responsiveness. Good: ≤ 200 ms, Needs improvement: ≤ 500 ms,
 * Poor: > 500 ms.
 *
 * @see https://web.dev/articles/inp
 */
function trackINP(): Promise<MetricReport> {
  return new Promise((resolve) => {
    onINP(
      (metric) => {
        resolve(normalizeMetric(metric));
      },
      { reportAllChanges: false },
    );
  });
}

/**
 * CLS — Cumulative Layout Shift
 *
 * Measures visual stability. Good: ≤ 0.1, Needs improvement: ≤ 0.25,
 * Poor: > 0.25.
 *
 * @see https://web.dev/articles/cls
 */
function trackCLS(): Promise<MetricReport> {
  return new Promise((resolve) => {
    onCLS(
      (metric) => {
        resolve(normalizeMetric(metric));
      },
      { reportAllChanges: false },
    );
  });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialize Core Web Vitals (LCP, INP, CLS) tracking and report each metric
 * to Vercel Analytics once it becomes available.
 *
 * Call this once at the app root via `AnalyticsInit` (client component).
 * Metrics are reported asynchronously — this function returns immediately
 * after initiating listeners.
 *
 * @returns TrackWebVitalsResult describing the outcome of initiating listeners.
 */
export async function trackWebVitals(): Promise<TrackWebVitalsResult> {
  const { allowed, error } = canTrack();
  if (!allowed) {
    return { success: false, error };
  }

  try {
    // Initiate all three metric listeners in parallel.
    // Each resolves once the metric value is finalised by the browser.
    const [lcp, inp, cls] = await Promise.all([trackLCP(), trackINP(), trackCLS()]);

    const metrics: MetricReport[] = [lcp, inp, cls];

    return { success: true, metrics };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Failed to track web vitals",
    };
  }
}

// ---------------------------------------------------------------------------
// Individual metric helpers (for on-demand checks)
// ---------------------------------------------------------------------------

/**
 * Get a single LCP metric report. Resolves once the LCP is finalised.
 * Returns null if tracking is not allowed (SSR or DNT).
 */
export async function getLCP(): Promise<MetricReport | null> {
  const { allowed } = canTrack();
  if (!allowed) return null;
  try {
    return await trackLCP();
  } catch {
    return null;
  }
}

/**
 * Get a single INP metric report. Resolves once the INP is finalised.
 * Returns null if tracking is not allowed (SSR or DNT).
 */
export async function getINP(): Promise<MetricReport | null> {
  const { allowed } = canTrack();
  if (!allowed) return null;
  try {
    return await trackINP();
  } catch {
    return null;
  }
}

/**
 * Get a single CLS metric report. Resolves once the CLS is finalised.
 * Returns null if tracking is not allowed (SSR or DNT).
 */
export async function getCLS(): Promise<MetricReport | null> {
  const { allowed } = canTrack();
  if (!allowed) return null;
  try {
    return await trackCLS();
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Threshold constants (Core Web Vitals thresholds)
// ---------------------------------------------------------------------------

/** Good / needs-improvement / poor thresholds for LCP (milliseconds) */
export const LCP_THRESHOLDS = { good: 2500, needsImprovement: 4000 } as const;

/** Good / needs-improvement / poor thresholds for INP (milliseconds) */
export const INP_THRESHOLDS = { good: 200, needsImprovement: 500 } as const;

/** Good / needs-improvement / poor thresholds for CLS (unitless) */
export const CLS_THRESHOLDS = { good: 0.1, needsImprovement: 0.25 } as const;

/**
 * Classify a numeric metric value against standard Core Web Vitals thresholds.
 *
 * @example
 * classifyMetric("LCP", 1200) // => "good"
 * classifyMetric("INP", 350)  // => "needs-improvement"
 */
export function classifyMetric(
  name: MetricName,
  value: number,
): "good" | "needs-improvement" | "poor" {
  switch (name) {
    case "LCP":
      if (value <= LCP_THRESHOLDS.good) return "good";
      if (value <= LCP_THRESHOLDS.needsImprovement) return "needs-improvement";
      return "poor";
    case "INP":
      if (value <= INP_THRESHOLDS.good) return "good";
      if (value <= INP_THRESHOLDS.needsImprovement) return "needs-improvement";
      return "poor";
    case "CLS":
      if (value <= CLS_THRESHOLDS.good) return "good";
      if (value <= CLS_THRESHOLDS.needsImprovement) return "needs-improvement";
      return "poor";
    default:
      return "poor";
  }
}
