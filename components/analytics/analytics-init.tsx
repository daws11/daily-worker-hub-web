"use client";

import { useEffect } from "react";

/**
 * AnalyticsInit — Client component that initializes Vercel Analytics.
 *
 * Must be rendered inside a client boundary (e.g. inside RootLayout).
 * Safe to use in SSR: all SDK calls are guarded by `typeof window !== 'undefined'`.
 *
 * Future phase (phase 3): this component will also call `trackWebVitals()`
 * from `lib/analytics/web-vitals.ts` to report LCP, FID, CLS, INP to
 * Vercel Analytics. Web Vitals tracking is deferred until the `web-vitals`
 * package is installed and `lib/analytics/web-vitals.ts` is created.
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
    };

    init();

    return () => {
      mounted = false;
    };
  }, []);

  // This component renders nothing — it only bootstraps the analytics SDK.
  return null;
}
