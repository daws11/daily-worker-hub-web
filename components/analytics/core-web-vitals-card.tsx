import type { LucideIcon } from "lucide-react";
import { Activity, Gauge, Zap } from "lucide-react";

export interface CoreWebVitalsCardProps {
  /**
   * Core Web Vital metric name.
   * - LCP: Largest Contentful Paint (ms)
   * - INP: Interaction to Next Paint (ms)
   * - CLS: Cumulative Layout Shift (unitless)
   */
  metric: "LCP" | "INP" | "CLS";
  value: number;
  /**
   * Performance rating derived from standard Core Web Vitals thresholds.
   * - good: ≤ 2500 ms (LCP), ≤ 200 ms (INP), ≤ 0.1 (CLS)
   * - needs-improvement: ≤ 4000 ms (LCP), ≤ 500 ms (INP), ≤ 0.25 (CLS)
   * - poor: > 4000 ms (LCP), > 500 ms (INP), > 0.25 (CLS)
   */
  rating: "good" | "needs-improvement" | "poor";
  icon?: LucideIcon;
}

// ---------------------------------------------------------------------------
// Colour maps (mirrors AnalyticsStatsCard style)
// ---------------------------------------------------------------------------

const ratingColorMap = {
  good: "#10b981",
  "needs-improvement": "#f59e0b",
  poor: "#ef4444",
} as const;

const ratingBgIconColorMap = {
  good: "#d1fae5",
  "needs-improvement": "#fed7aa",
  poor: "#fee2e2",
} as const;

const ratingBadgeBgMap = {
  good: "#d1fae5",
  "needs-improvement": "#fed7aa",
  poor: "#fee2e2",
} as const;

const ratingBadgeTextMap = {
  good: "#065f46",
  "needs-improvement": "#92400e",
  poor: "#991b1b",
} as const;

const ratingLabelMap = {
  good: "Good",
  "needs-improvement": "Needs Improvement",
  poor: "Poor",
} as const;

// ---------------------------------------------------------------------------
// Metric-specific icons (defaults per metric)
// ---------------------------------------------------------------------------

const defaultIconMap: Record<CoreWebVitalsCardProps["metric"], LucideIcon> = {
  LCP: Activity,
  INP: Zap,
  CLS: Gauge,
};

// ---------------------------------------------------------------------------
// Value formatter
// ---------------------------------------------------------------------------

function formatValue(metric: CoreWebVitalsCardProps["metric"], value: number): string {
  if (metric === "CLS") {
    return value.toFixed(3);
  }
  return `${Math.round(value)} ms`;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function CoreWebVitalsCard({
  metric,
  value,
  rating,
  icon: Icon,
}: CoreWebVitalsCardProps) {
  const valueColor = ratingColorMap[rating];
  const iconBgColor = ratingBgIconColorMap[rating];
  const iconColor = valueColor;
  const badgeBg = ratingBadgeBgMap[rating];
  const badgeText = ratingBadgeTextMap[rating];

  const IconComponent: LucideIcon = Icon ?? defaultIconMap[metric];

  return (
    <div
      style={{
        padding: "1rem",
        border: "1px solid #e5e7eb",
        borderRadius: "0.375rem",
        backgroundColor: "white",
        display: "flex",
        flexDirection: "column",
        gap: "0.5rem",
      }}
    >
      {/* Header with metric label and icon */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "0.125rem" }}>
          <h3
            style={{
              fontSize: "0.75rem",
              fontWeight: 500,
              color: "#6b7280",
              margin: 0,
              textTransform: "uppercase",
              letterSpacing: "0.05em",
            }}
          >
            {metric}
          </h3>
          <p
            style={{
              fontSize: "0.65rem",
              color: "#9ca3af",
              margin: 0,
            }}
          >
            {metric === "LCP"
              ? "Largest Contentful Paint"
              : metric === "INP"
                ? "Interaction to Next Paint"
                : "Cumulative Layout Shift"}
          </p>
        </div>
        <div
          style={{
            width: "2rem",
            height: "2rem",
            borderRadius: "0.375rem",
            backgroundColor: iconBgColor,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <IconComponent
            style={{ width: "1.125rem", height: "1.125rem", color: iconColor }}
          />
        </div>
      </div>

      {/* Metric value */}
      <p
        style={{
          fontSize: "1.75rem",
          fontWeight: "bold",
          color: valueColor,
          margin: 0,
          lineHeight: 1,
        }}
      >
        {formatValue(metric, value)}
      </p>

      {/* Rating badge */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          padding: "0.125rem 0.5rem",
          borderRadius: "9999px",
          backgroundColor: badgeBg,
          width: "fit-content",
        }}
      >
        <span
          style={{
            fontSize: "0.6875rem",
            fontWeight: 600,
            color: badgeText,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
          }}
        >
          {ratingLabelMap[rating]}
        </span>
      </div>
    </div>
  );
}
