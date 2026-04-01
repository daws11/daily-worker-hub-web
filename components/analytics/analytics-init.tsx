"use client";

import { useEffect } from "react";
import { trackWebVitals } from "lib/analytics/web-vitals";

/**
 * AnalyticsInit — Client component that initializes Vercel Analytics.
 *
 * Must be rendered inside a client boundary (e.g. inside RootLayout).
 * Safe to use in SSR: all SDK calls are guarded by `typeof window !== 'undefined'`.
 *
 * Calls `trackWebVitals()` to report LCP, INP, and CLS metrics to Vercel Analytics.
 */
export function AnalyticsInit() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let mounted = true;

    const init = async () => {
      if (!mounted) return;
      try {
        const { inject } = await import("@vercel/analytics");
        inject();
      } catch (err) {
        // Analytics SDK must not break user flows — gracefully degrade on error.
        console.error("[AnalyticsInit] Failed to initialize Vercel Analytics:", err);
      }

      // Fire-and-forget: report Core Web Vitals to Vercel Analytics.
      trackWebVitals().catch((err) => {
        console.error("[AnalyticsInit] Failed to track web vitals:", err);
      });
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  // This component renders nothing — it only bootstraps the analytics SDK.
  return null;
}
