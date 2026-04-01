/**
 * CoreWebVitalsCard Component Tests
 *
 * Tests for the CoreWebVitalsCard component which displays
 * Core Web Vitals metrics (LCP, INP, CLS) with performance ratings.
 *
 * Uses react-dom/server for rendering since @testing-library/react is not
 * installed in this project.
 *
 * Coverage:
 * - Renders metric name (LCP / INP / CLS)
 * - Renders full metric description
 * - Displays formatted value (ms for LCP/INP, decimal for CLS)
 * - Displays rating badge with correct label
 * - Custom icon support
 * - Value formatting edge cases
 */

import { describe, it, expect } from "vitest";
import { renderToString } from "react-dom/server";
import { CoreWebVitalsCard, formatValue } from "../../components/analytics/core-web-vitals-card";
import { Activity, Zap, Gauge } from "lucide-react";

// ---------------------------------------------------------------------------
// Metric descriptions
// ---------------------------------------------------------------------------

const metricDescriptions: Record<"LCP" | "INP" | "CLS", string> = {
  LCP: "Largest Contentful Paint",
  INP: "Interaction to Next Paint",
  CLS: "Cumulative Layout Shift",
};

// ---------------------------------------------------------------------------
// Helper: render component and return HTML string
// ---------------------------------------------------------------------------

function renderCard(props: {
  metric: "LCP" | "INP" | "CLS";
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  icon?: React.ComponentType<{ style?: React.CSSProperties }>;
}) {
  return renderToString(<CoreWebVitalsCard {...props} />);
}

// ---------------------------------------------------------------------------
// formatValue unit tests
// ---------------------------------------------------------------------------

describe("CoreWebVitalsCard formatValue", () => {
  describe("LCP and INP (millisecond metrics)", () => {
    it("should format LCP with ms suffix", () => {
      expect(formatValue("LCP", 1800)).toBe("1800 ms");
    });

    it("should format INP with ms suffix", () => {
      expect(formatValue("INP", 200)).toBe("200 ms");
    });

    it("should round to nearest integer", () => {
      expect(formatValue("LCP", 1999.6)).toBe("2000 ms");
    });

    it("should format zero value", () => {
      expect(formatValue("LCP", 0)).toBe("0 ms");
    });

    it("should format boundary good LCP (2500ms)", () => {
      expect(formatValue("LCP", 2500)).toBe("2500 ms");
    });

    it("should format boundary needs-improvement LCP (4000ms)", () => {
      expect(formatValue("LCP", 4000)).toBe("4000 ms");
    });

    it("should format boundary good INP (200ms)", () => {
      expect(formatValue("INP", 200)).toBe("200 ms");
    });

    it("should format boundary needs-improvement INP (500ms)", () => {
      expect(formatValue("INP", 500)).toBe("500 ms");
    });

    it("should handle very large values", () => {
      expect(formatValue("LCP", 10000)).toBe("10000 ms");
    });

    it("should handle very small values", () => {
      expect(formatValue("INP", 1)).toBe("1 ms");
    });
  });

  describe("CLS (unitless metric)", () => {
    it("should format CLS to 3 decimal places", () => {
      expect(formatValue("CLS", 0.0999)).toBe("0.100");
    });

    it("should format CLS with trailing zeros", () => {
      expect(formatValue("CLS", 0.05)).toBe("0.050");
    });

    it("should format CLS zero", () => {
      expect(formatValue("CLS", 0)).toBe("0.000");
    });

    it("should format CLS boundary good (0.100)", () => {
      expect(formatValue("CLS", 0.1)).toBe("0.100");
    });

    it("should format CLS boundary needs-improvement (0.250)", () => {
      expect(formatValue("CLS", 0.25)).toBe("0.250");
    });

    it("should format CLS near poor threshold (0.251)", () => {
      expect(formatValue("CLS", 0.251)).toBe("0.251");
    });

    it("should handle CLS value of 1.0", () => {
      expect(formatValue("CLS", 1.0)).toBe("1.000");
    });

    it("should handle very small CLS (0.001)", () => {
      expect(formatValue("CLS", 0.001)).toBe("0.001");
    });
  });
});

// ---------------------------------------------------------------------------
// Component rendering tests
// ---------------------------------------------------------------------------

describe("CoreWebVitalsCard rendering", () => {
  describe("Metric name and description", () => {
    it("should render LCP metric name", () => {
      const html = renderCard({ metric: "LCP", value: 1800, rating: "good" });
      expect(html).toContain("LCP");
    });

    it("should render LCP full description", () => {
      const html = renderCard({ metric: "LCP", value: 1800, rating: "good" });
      expect(html).toContain(metricDescriptions.LCP);
    });

    it("should render INP description", () => {
      const html = renderCard({ metric: "INP", value: 200, rating: "good" });
      expect(html).toContain(metricDescriptions.INP);
    });

    it("should render CLS description", () => {
      const html = renderCard({ metric: "CLS", value: 0.05, rating: "good" });
      expect(html).toContain(metricDescriptions.CLS);
    });
  });

  describe("Formatted value display", () => {
    it("should display LCP value with ms suffix", () => {
      const html = renderCard({ metric: "LCP", value: 2500, rating: "good" });
      expect(html).toContain("2500 ms");
    });

    it("should display INP value with ms suffix", () => {
      const html = renderCard({ metric: "INP", value: 400, rating: "needs-improvement" });
      expect(html).toContain("400 ms");
    });

    it("should display CLS value with 3 decimal places", () => {
      const html = renderCard({ metric: "CLS", value: 0.2, rating: "needs-improvement" });
      expect(html).toContain("0.200");
    });

    it("should display very good LCP (500ms)", () => {
      const html = renderCard({ metric: "LCP", value: 500, rating: "good" });
      expect(html).toContain("500 ms");
    });

    it("should display very poor LCP (8000ms)", () => {
      const html = renderCard({ metric: "LCP", value: 8000, rating: "poor" });
      expect(html).toContain("8000 ms");
    });

    it("should display CLS with trailing zeros", () => {
      const html = renderCard({ metric: "CLS", value: 0.05, rating: "good" });
      expect(html).toContain("0.050");
    });
  });

  describe("Rating badge", () => {
    it('should display "Good" badge for good rating', () => {
      const html = renderCard({ metric: "LCP", value: 1200, rating: "good" });
      expect(html).toContain("Good");
    });

    it('should display "Needs Improvement" badge', () => {
      const html = renderCard({
        metric: "LCP",
        value: 3500,
        rating: "needs-improvement",
      });
      expect(html).toContain("Needs Improvement");
    });

    it('should display "Poor" badge for poor rating', () => {
      const html = renderCard({ metric: "LCP", value: 5000, rating: "poor" });
      expect(html).toContain("Poor");
    });

    it("should show Good for INP good rating", () => {
      const html = renderCard({ metric: "INP", value: 100, rating: "good" });
      expect(html).toContain("Good");
    });

    it("should show Poor for CLS poor rating", () => {
      const html = renderCard({ metric: "CLS", value: 0.5, rating: "poor" });
      expect(html).toContain("Poor");
    });
  });

  describe("All metrics with different ratings", () => {
    it("should render LCP with good rating (all parts)", () => {
      const html = renderCard({ metric: "LCP", value: 1500, rating: "good" });
      expect(html).toContain("LCP");
      expect(html).toContain("1500 ms");
      expect(html).toContain("Good");
      expect(html).toContain("Largest Contentful Paint");
    });

    it("should render INP with needs-improvement rating (all parts)", () => {
      const html = renderCard({
        metric: "INP",
        value: 400,
        rating: "needs-improvement",
      });
      expect(html).toContain("INP");
      expect(html).toContain("400 ms");
      expect(html).toContain("Needs Improvement");
      expect(html).toContain("Interaction to Next Paint");
    });

    it("should render CLS with needs-improvement rating (all parts)", () => {
      const html = renderCard({
        metric: "CLS",
        value: 0.2,
        rating: "needs-improvement",
      });
      expect(html).toContain("CLS");
      expect(html).toContain("0.200");
      expect(html).toContain("Needs Improvement");
      expect(html).toContain("Cumulative Layout Shift");
    });

    it("should render CLS with poor rating", () => {
      const html = renderCard({ metric: "CLS", value: 0.35, rating: "poor" });
      expect(html).toContain("CLS");
      expect(html).toContain("0.350");
      expect(html).toContain("Poor");
    });
  });

  describe("Custom icon support", () => {
    it("should render with Activity icon passed explicitly", () => {
      const html = renderCard({
        metric: "LCP",
        value: 1800,
        rating: "good",
        icon: Activity,
      });
      expect(html).toContain("LCP");
      expect(html).toContain("Good");
    });

    it("should render with Zap icon passed explicitly", () => {
      const html = renderCard({
        metric: "INP",
        value: 150,
        rating: "good",
        icon: Zap,
      });
      expect(html).toContain("INP");
      expect(html).toContain("150 ms");
    });

    it("should render with Gauge icon passed explicitly", () => {
      const html = renderCard({
        metric: "CLS",
        value: 0.05,
        rating: "good",
        icon: Gauge,
      });
      expect(html).toContain("CLS");
      expect(html).toContain("0.050");
    });

    it("should render with custom icon for LCP and display all content", () => {
      const html = renderCard({
        metric: "LCP",
        value: 1800,
        rating: "good",
        icon: Activity,
      });
      // Should still render all expected content
      expect(html).toContain("LCP");
      expect(html).toContain("Largest Contentful Paint");
      expect(html).toContain("1800 ms");
      expect(html).toContain("Good");
    });
  });

  describe("Edge cases", () => {
    it("should handle very good LCP (500ms)", () => {
      const html = renderCard({ metric: "LCP", value: 500, rating: "good" });
      expect(html).toContain("500 ms");
      expect(html).toContain("Good");
    });

    it("should handle very poor LCP (8000ms)", () => {
      const html = renderCard({ metric: "LCP", value: 8000, rating: "poor" });
      expect(html).toContain("8000 ms");
      expect(html).toContain("Poor");
    });

    it("should handle very good CLS (0.001)", () => {
      const html = renderCard({ metric: "CLS", value: 0.001, rating: "good" });
      expect(html).toContain("0.001");
      expect(html).toContain("Good");
    });

    it("should handle CLS value of 1.0 (very poor)", () => {
      const html = renderCard({ metric: "CLS", value: 1.0, rating: "poor" });
      expect(html).toContain("1.000");
      expect(html).toContain("Poor");
    });

    it("should handle LCP boundary needs-improvement (4000ms)", () => {
      const html = renderCard({
        metric: "LCP",
        value: 4000,
        rating: "needs-improvement",
      });
      expect(html).toContain("4000 ms");
      expect(html).toContain("Needs Improvement");
    });

    it("should handle INP boundary needs-improvement (500ms)", () => {
      const html = renderCard({
        metric: "INP",
        value: 500,
        rating: "needs-improvement",
      });
      expect(html).toContain("500 ms");
      expect(html).toContain("Needs Improvement");
    });

    it("should handle CLS boundary needs-improvement (0.250)", () => {
      const html = renderCard({
        metric: "CLS",
        value: 0.25,
        rating: "needs-improvement",
      });
      expect(html).toContain("0.250");
      expect(html).toContain("Needs Improvement");
    });
  });

  describe("Component structure", () => {
    it("should render as a div container", () => {
      const html = renderCard({ metric: "LCP", value: 1200, rating: "good" });
      expect(html).toContain("<div");
    });

    it("should contain an h3 for metric label", () => {
      const html = renderCard({ metric: "LCP", value: 1200, rating: "good" });
      expect(html).toContain("<h3");
    });

    it("should contain a span for rating badge", () => {
      const html = renderCard({ metric: "LCP", value: 1200, rating: "good" });
      expect(html).toContain("<span");
    });

    it("should render LCP and INP descriptions consistently", () => {
      const lcpHtml = renderCard({ metric: "LCP", value: 1200, rating: "good" });
      const inpHtml = renderCard({ metric: "INP", value: 120, rating: "good" });
      expect(lcpHtml).toContain("Largest Contentful Paint");
      expect(inpHtml).toContain("Interaction to Next Paint");
    });
  });
});
