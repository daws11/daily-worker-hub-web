/**
 * Core Web Vitals Unit Tests
 *
 * Tests lib/analytics/web-vitals.ts:
 * - Browser context guard (rejects server-side calls)
 * - Do Not Track (DNT) compliance
 * - Metric normalization
 * - Individual metric trackers (LCP, INP, CLS)
 * - Main trackWebVitals() function
 * - Individual metric getters
 * - classifyMetric() function
 * - Threshold constants
 *
 * Strategy: Mock `web-vitals` entirely. happy-dom provides window/navigator
 * globals so DNT guards and server-context guards can be exercised in the
 * test environment.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock web-vitals before importing the module under test
// vi.hoisted() is hoisted alongside vi.mock so the mock functions are shared
// between the factory (used by the mocked module) and test code.
// ---------------------------------------------------------------------------

type MetricCallback = (metric: {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  id: string;
  delta: number;
  navigationType?: string;
}) => void;

type WebVitalsAttacher = (
  onMetric: MetricCallback,
  opts?: { reportAllChanges: boolean },
) => void;

const { mockOnCLS, mockOnINP, mockOnLCP } = vi.hoisted(() => ({
  mockOnCLS: vi.fn<(cb: (m: Parameters<MetricCallback>[0]) => void, opts?: { reportAllChanges: boolean }) => void>(),
  mockOnINP: vi.fn<(cb: (m: Parameters<MetricCallback>[0]) => void, opts?: { reportAllChanges: boolean }) => void>(),
  mockOnLCP: vi.fn<(cb: (m: Parameters<MetricCallback>[0]) => void, opts?: { reportAllChanges: boolean }) => void>(),
}));

vi.mock("web-vitals", () => ({
  onCLS: mockOnCLS as unknown as WebVitalsAttacher,
  onINP: mockOnINP as unknown as WebVitalsAttacher,
  onLCP: mockOnLCP as unknown as WebVitalsAttacher,
}));

// ---------------------------------------------------------------------------
// Import the module under test
// ---------------------------------------------------------------------------

import {
  trackWebVitals,
  getLCP,
  getINP,
  getCLS,
  classifyMetric,
  LCP_THRESHOLDS,
  INP_THRESHOLDS,
  CLS_THRESHOLDS,
  type MetricReport,
} from "../web-vitals";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Snapshot of a resolved web-vitals metric, used to simulate browser events. */
function makeMetric(
  name: "LCP" | "INP" | "CLS",
  value: number,
  rating: "good" | "needs-improvement" | "poor",
): {
  name: string;
  value: number;
  rating: "good" | "needs-improvement" | "poor";
  id: string;
  delta: number;
  navigationType?: string;
} {
  return {
    name,
    value,
    rating,
    id: `metric-${name}-${Math.random().toString(36).slice(2)}`,
    delta: value,
    navigationType: "navigate",
  };
}

/**
 * Simulate server context by removing the `window` global that happy-dom injects.
 */
function simulateServerContext() {
  const realWindow = globalThis.window;
  // Intentionally remove window to simulate server env
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delete (globalThis as any).window;
  return () => {
    globalThis.window = realWindow;
  };
}

/** Simulate Do Not Track being enabled via navigator.doNotTrack. */
function setDoNotTrack(value: "1" | "0" | null) {
  const prev = navigator.doNotTrack;
  Object.defineProperty(navigator, "doNotTrack", {
    value,
    configurable: true,
  });
  return () => {
    Object.defineProperty(navigator, "doNotTrack", {
      value: prev,
      configurable: true,
    });
  };
}

/** Simulate window.doNotTrack separately from navigator.doNotTrack. */
function setWindowDoNotTrack(value: "1" | "0" | null) {
  const win = globalThis.window as Window & { doNotTrack?: string | null };
  const prev = win?.doNotTrack;
  if (win) win.doNotTrack = value ?? undefined;
  return () => {
    if (win) win.doNotTrack = prev ?? undefined;
  };
}

/** Resolve a pending metric listener with the given metric data. */
function resolveMetric(
  mockFn: ReturnType<typeof vi.fn>,
  metric: ReturnType<typeof makeMetric>,
) {
  const [callback] = mockFn.mock.calls[0] as [MetricCallback];
  callback(metric);
}

// ---------------------------------------------------------------------------
// Reset mocks before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  mockOnCLS.mockClear();
  mockOnINP.mockClear();
  mockOnLCP.mockClear();

  // Ensure DNT is off so the default state = tracking allowed
  Object.defineProperty(navigator, "doNotTrack", {
    value: null,
    configurable: true,
  });
  const win = globalThis.window as Window & { doNotTrack?: string | null };
  if (win) win.doNotTrack = undefined;

  // By default, each onX function registers a callback without doing anything.
  // Tests that care about the resolved value will call resolveMetric() manually.
  mockOnCLS.mockImplementation((cb) => {});
  mockOnINP.mockImplementation((cb) => {});
  mockOnLCP.mockImplementation((cb) => {});
});

afterEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Core Web Vitals", () => {
  // -------------------------------------------------------------------------
  // Threshold constants
  // -------------------------------------------------------------------------
  describe("Threshold constants", () => {
    it("LCP_THRESHOLDS should have correct good and needsImprovement values", () => {
      expect(LCP_THRESHOLDS.good).toBe(2500);
      expect(LCP_THRESHOLDS.needsImprovement).toBe(4000);
    });

    it("INP_THRESHOLDS should have correct good and needsImprovement values", () => {
      expect(INP_THRESHOLDS.good).toBe(200);
      expect(INP_THRESHOLDS.needsImprovement).toBe(500);
    });

    it("CLS_THRESHOLDS should have correct good and needsImprovement values", () => {
      expect(CLS_THRESHOLDS.good).toBe(0.1);
      expect(CLS_THRESHOLDS.needsImprovement).toBe(0.25);
    });

    it("threshold objects should have correct values", () => {
      // as const makes values readonly in TypeScript; we verify the values are correct.
      expect(LCP_THRESHOLDS.good).toBe(2500);
      expect(LCP_THRESHOLDS.needsImprovement).toBe(4000);
      expect(INP_THRESHOLDS.good).toBe(200);
      expect(INP_THRESHOLDS.needsImprovement).toBe(500);
      expect(CLS_THRESHOLDS.good).toBe(0.1);
      expect(CLS_THRESHOLDS.needsImprovement).toBe(0.25);
    });
  });

  // -------------------------------------------------------------------------
  // classifyMetric
  // -------------------------------------------------------------------------
  describe("classifyMetric", () => {
    // LCP – unit: milliseconds
    describe("LCP", () => {
      it("should return 'good' when LCP <= 2500ms", () => {
        expect(classifyMetric("LCP", 0)).toBe("good");
        expect(classifyMetric("LCP", 1000)).toBe("good");
        expect(classifyMetric("LCP", 2500)).toBe("good");
      });

      it("should return 'needs-improvement' when 2500ms < LCP <= 4000ms", () => {
        expect(classifyMetric("LCP", 2501)).toBe("needs-improvement");
        expect(classifyMetric("LCP", 3000)).toBe("needs-improvement");
        expect(classifyMetric("LCP", 4000)).toBe("needs-improvement");
      });

      it("should return 'poor' when LCP > 4000ms", () => {
        expect(classifyMetric("LCP", 4001)).toBe("poor");
        expect(classifyMetric("LCP", 10000)).toBe("poor");
      });
    });

    // INP – unit: milliseconds
    describe("INP", () => {
      it("should return 'good' when INP <= 200ms", () => {
        expect(classifyMetric("INP", 0)).toBe("good");
        expect(classifyMetric("INP", 50)).toBe("good");
        expect(classifyMetric("INP", 200)).toBe("good");
      });

      it("should return 'needs-improvement' when 200ms < INP <= 500ms", () => {
        expect(classifyMetric("INP", 201)).toBe("needs-improvement");
        expect(classifyMetric("INP", 350)).toBe("needs-improvement");
        expect(classifyMetric("INP", 500)).toBe("needs-improvement");
      });

      it("should return 'poor' when INP > 500ms", () => {
        expect(classifyMetric("INP", 501)).toBe("poor");
        expect(classifyMetric("INP", 1000)).toBe("poor");
      });
    });

    // CLS – unitless
    describe("CLS", () => {
      it("should return 'good' when CLS <= 0.1", () => {
        expect(classifyMetric("CLS", 0)).toBe("good");
        expect(classifyMetric("CLS", 0.05)).toBe("good");
        expect(classifyMetric("CLS", 0.1)).toBe("good");
      });

      it("should return 'needs-improvement' when 0.1 < CLS <= 0.25", () => {
        expect(classifyMetric("CLS", 0.11)).toBe("needs-improvement");
        expect(classifyMetric("CLS", 0.2)).toBe("needs-improvement");
        expect(classifyMetric("CLS", 0.25)).toBe("needs-improvement");
      });

      it("should return 'poor' when CLS > 0.25", () => {
        expect(classifyMetric("CLS", 0.26)).toBe("poor");
        expect(classifyMetric("CLS", 0.5)).toBe("poor");
        expect(classifyMetric("CLS", 1.0)).toBe("poor");
      });
    });

    // Unknown metric name defaults to "poor"
    describe("unknown metric name", () => {
      it("should return 'poor' for unknown metric name", () => {
        // @ts-expect-error – deliberately passing an invalid metric name
        expect(classifyMetric("UNKNOWN", 0)).toBe("poor");
        // @ts-expect-error – deliberately passing an invalid metric name
        expect(classifyMetric("FID", 100)).toBe("poor");
      });
    });

    // Realistic Core Web Vitals values
    describe("Realistic Bali Worker Hub page-load scenarios", () => {
      it("should classify a fast LCP (good) from CDN-cached page", () => {
        expect(classifyMetric("LCP", 1200)).toBe("good");
      });

      it("should classify a moderate LCP (needs-improvement) on 4G", () => {
        expect(classifyMetric("LCP", 3200)).toBe("needs-improvement");
      });

      it("should classify a slow LCP (poor) on slow 3G", () => {
        expect(classifyMetric("LCP", 6000)).toBe("poor");
      });

      it("should classify a snappy INP (good)", () => {
        expect(classifyMetric("INP", 80)).toBe("good");
      });

      it("should classify a sluggish INP (needs-improvement)", () => {
        expect(classifyMetric("INP", 350)).toBe("needs-improvement");
      });

      it("should classify a frozen INP (poor)", () => {
        expect(classifyMetric("INP", 700)).toBe("poor");
      });

      it("should classify a stable CLS (good)", () => {
        expect(classifyMetric("CLS", 0.05)).toBe("good");
      });

      it("should classify a moderate CLS (needs-improvement)", () => {
        expect(classifyMetric("CLS", 0.2)).toBe("needs-improvement");
      });

      it("should classify a chaotic CLS (poor)", () => {
        expect(classifyMetric("CLS", 0.4)).toBe("poor");
      });
    });
  });

  // -------------------------------------------------------------------------
  // Browser context guard
  // -------------------------------------------------------------------------
  describe("Browser context guard", () => {
    it("should reject trackWebVitals in server context", async () => {
      const restore = simulateServerContext();
      try {
        const result = await trackWebVitals();
        expect(result.success).toBe(false);
        expect(result.error).toBe("Cannot track web vitals in server context");
      } finally {
        restore();
      }
    });

    it("should reject getLCP in server context", async () => {
      const restore = simulateServerContext();
      try {
        const result = await getLCP();
        expect(result).toBeNull();
      } finally {
        restore();
      }
    });

    it("should reject getINP in server context", async () => {
      const restore = simulateServerContext();
      try {
        const result = await getINP();
        expect(result).toBeNull();
      } finally {
        restore();
      }
    });

    it("should reject getCLS in server context", async () => {
      const restore = simulateServerContext();
      try {
        const result = await getCLS();
        expect(result).toBeNull();
      } finally {
        restore();
      }
    });
  });

  // -------------------------------------------------------------------------
  // Do Not Track Guard – navigator.doNotTrack
  // -------------------------------------------------------------------------
  describe("Do Not Track – navigator.doNotTrack", () => {
    it("should reject trackWebVitals when navigator.doNotTrack is '1'", async () => {
      const restore = setDoNotTrack("1");
      try {
        const result = await trackWebVitals();
        expect(result.success).toBe(false);
        expect(result.error).toBe("User has Do Not Track enabled");
      } finally {
        restore();
      }
    });

    it("should reject getLCP when navigator.doNotTrack is '1'", async () => {
      const restore = setDoNotTrack("1");
      try {
        const result = await getLCP();
        expect(result).toBeNull();
      } finally {
        restore();
      }
    });

    it("should reject getINP when navigator.doNotTrack is '1'", async () => {
      const restore = setDoNotTrack("1");
      try {
        const result = await getINP();
        expect(result).toBeNull();
      } finally {
        restore();
      }
    });

    it("should reject getCLS when navigator.doNotTrack is '1'", async () => {
      const restore = setDoNotTrack("1");
      try {
        const result = await getCLS();
        expect(result).toBeNull();
      } finally {
        restore();
      }
    });
  });

  // -------------------------------------------------------------------------
  // Do Not Track Guard – window.doNotTrack
  // -------------------------------------------------------------------------
  describe("Do Not Track – window.doNotTrack", () => {
    it("should reject trackWebVitals when window.doNotTrack is '1'", async () => {
      const restore = setWindowDoNotTrack("1");
      try {
        const result = await trackWebVitals();
        expect(result.success).toBe(false);
        expect(result.error).toBe("User has Do Not Track enabled");
      } finally {
        restore();
      }
    });

    it("should allow trackWebVitals when window.doNotTrack is '0'", async () => {
      const restore = setWindowDoNotTrack("0");
      try {
        // Wire up mocks to resolve immediately
        mockOnLCP.mockImplementation((cb) => cb(makeMetric("LCP", 1500, "good")));
        mockOnINP.mockImplementation((cb) => cb(makeMetric("INP", 100, "good")));
        mockOnCLS.mockImplementation((cb) => cb(makeMetric("CLS", 0.05, "good")));

        const result = await trackWebVitals();
        expect(result.success).toBe(true);
        expect(result.metrics).toBeDefined();
        expect(result.metrics).toHaveLength(3);
      } finally {
        restore();
      }
    });
  });

  // -------------------------------------------------------------------------
  // Individual metric listeners are registered
  // -------------------------------------------------------------------------
  describe("Individual metric listener registration", () => {
    it("should call onLCP when calling trackWebVitals", async () => {
      mockOnLCP.mockImplementation((cb) => cb(makeMetric("LCP", 1500, "good")));
      mockOnINP.mockImplementation((cb) => cb(makeMetric("INP", 100, "good")));
      mockOnCLS.mockImplementation((cb) => cb(makeMetric("CLS", 0.05, "good")));

      // Need all three to resolve so trackWebVitals completes
      await trackWebVitals();
      expect(mockOnLCP).toHaveBeenCalled();
    });

    it("should call onINP when calling trackWebVitals", async () => {
      mockOnLCP.mockImplementation((cb) => cb(makeMetric("LCP", 1500, "good")));
      mockOnINP.mockImplementation((cb) => cb(makeMetric("INP", 100, "good")));
      mockOnCLS.mockImplementation((cb) => cb(makeMetric("CLS", 0.05, "good")));

      await trackWebVitals();
      expect(mockOnINP).toHaveBeenCalled();
    });

    it("should call onCLS when calling trackWebVitals", async () => {
      mockOnLCP.mockImplementation((cb) => cb(makeMetric("LCP", 1500, "good")));
      mockOnINP.mockImplementation((cb) => cb(makeMetric("INP", 100, "good")));
      mockOnCLS.mockImplementation((cb) => cb(makeMetric("CLS", 0.05, "good")));

      await trackWebVitals();
      expect(mockOnCLS).toHaveBeenCalled();
    });

    it("should pass { reportAllChanges: false } to onLCP", async () => {
      mockOnLCP.mockImplementation((cb) => cb(makeMetric("LCP", 1500, "good")));
      mockOnINP.mockImplementation((cb) => cb(makeMetric("INP", 100, "good")));
      mockOnCLS.mockImplementation((cb) => cb(makeMetric("CLS", 0.05, "good")));

      await trackWebVitals();
      expect(mockOnLCP).toHaveBeenCalledWith(
        expect.any(Function),
        { reportAllChanges: false },
      );
    });

    it("should pass { reportAllChanges: false } to onINP", async () => {
      mockOnLCP.mockImplementation((cb) => cb(makeMetric("LCP", 1500, "good")));
      mockOnINP.mockImplementation((cb) => cb(makeMetric("INP", 100, "good")));
      mockOnCLS.mockImplementation((cb) => cb(makeMetric("CLS", 0.05, "good")));

      await trackWebVitals();
      expect(mockOnINP).toHaveBeenCalledWith(
        expect.any(Function),
        { reportAllChanges: false },
      );
    });

    it("should pass { reportAllChanges: false } to onCLS", async () => {
      mockOnLCP.mockImplementation((cb) => cb(makeMetric("LCP", 1500, "good")));
      mockOnINP.mockImplementation((cb) => cb(makeMetric("INP", 100, "good")));
      mockOnCLS.mockImplementation((cb) => cb(makeMetric("CLS", 0.05, "good")));

      await trackWebVitals();
      expect(mockOnCLS).toHaveBeenCalledWith(
        expect.any(Function),
        { reportAllChanges: false },
      );
    });
  });

  // -------------------------------------------------------------------------
  // Successful trackWebVitals resolution
  // -------------------------------------------------------------------------
  describe("trackWebVitals – successful resolution", () => {
    it("should return all three metrics with correct structure", async () => {
      const lcpMetric = makeMetric("LCP", 1500, "good");
      const inpMetric = makeMetric("INP", 100, "good");
      const clsMetric = makeMetric("CLS", 0.05, "good");

      mockOnLCP.mockImplementation((cb) => cb(lcpMetric));
      mockOnINP.mockImplementation((cb) => cb(inpMetric));
      mockOnCLS.mockImplementation((cb) => cb(clsMetric));

      const result = await trackWebVitals();

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
      expect(result.metrics).toBeDefined();
      expect(result.metrics).toHaveLength(3);
    });

    it("should include id, value, rating, delta, and navigationType in each metric", async () => {
      const lcpMetric = makeMetric("LCP", 1500, "good");
      const inpMetric = makeMetric("INP", 100, "good");
      const clsMetric = makeMetric("CLS", 0.05, "good");

      mockOnLCP.mockImplementation((cb) => cb(lcpMetric));
      mockOnINP.mockImplementation((cb) => cb(inpMetric));
      mockOnCLS.mockImplementation((cb) => cb(clsMetric));

      const result = await trackWebVitals();

      result.metrics!.forEach((metric: MetricReport) => {
        expect(metric).toHaveProperty("id");
        expect(typeof metric.id).toBe("string");
        expect(metric).toHaveProperty("value");
        expect(typeof metric.value).toBe("number");
        expect(metric).toHaveProperty("rating");
        expect(["good", "needs-improvement", "poor"]).toContain(metric.rating);
        expect(metric).toHaveProperty("delta");
        expect(typeof metric.delta).toBe("number");
        expect(metric).toHaveProperty("navigationType");
        expect(typeof metric.navigationType).toBe("string");
      });
    });

    it("should map metric.name to 'LCP', 'INP', or 'CLS'", async () => {
      const lcpMetric = makeMetric("LCP", 1500, "good");
      const inpMetric = makeMetric("INP", 100, "good");
      const clsMetric = makeMetric("CLS", 0.05, "good");

      mockOnLCP.mockImplementation((cb) => cb(lcpMetric));
      mockOnINP.mockImplementation((cb) => cb(inpMetric));
      mockOnCLS.mockImplementation((cb) => cb(clsMetric));

      const result = await trackWebVitals();

      const names = result.metrics!.map((m) => m.name);
      expect(names).toContain("LCP");
      expect(names).toContain("INP");
      expect(names).toContain("CLS");
    });

    it("should default navigationType to 'navigate' when not provided", async () => {
      const lcpMetric = makeMetric("LCP", 1500, "good");
      const inpMetric = { ...makeMetric("INP", 100, "good"), navigationType: undefined };
      const clsMetric = { ...makeMetric("CLS", 0.05, "good"), navigationType: undefined };

      mockOnLCP.mockImplementation((cb) => cb(lcpMetric));
      mockOnINP.mockImplementation((cb) => cb(inpMetric));
      mockOnCLS.mockImplementation((cb) => cb(clsMetric));

      const result = await trackWebVitals();

      result.metrics!.forEach((metric: MetricReport) => {
        expect(metric.navigationType).toBe("navigate");
      });
    });

    it("should preserve explicit navigationType when provided", async () => {
      const lcpMetric = { ...makeMetric("LCP", 1500, "good"), navigationType: "reload" };
      const inpMetric = { ...makeMetric("INP", 100, "good"), navigationType: "reload" };
      const clsMetric = { ...makeMetric("CLS", 0.05, "good"), navigationType: "reload" };

      mockOnLCP.mockImplementation((cb) => cb(lcpMetric));
      mockOnINP.mockImplementation((cb) => cb(inpMetric));
      mockOnCLS.mockImplementation((cb) => cb(clsMetric));

      const result = await trackWebVitals();

      result.metrics!.forEach((metric: MetricReport) => {
        expect(metric.navigationType).toBe("reload");
      });
    });

    it("should handle mixed rating levels (good, needs-improvement, poor)", async () => {
      mockOnLCP.mockImplementation((cb) => cb(makeMetric("LCP", 3000, "needs-improvement")));
      mockOnINP.mockImplementation((cb) => cb(makeMetric("INP", 100, "good")));
      mockOnCLS.mockImplementation((cb) => cb(makeMetric("CLS", 0.3, "poor")));

      const result = await trackWebVitals();

      expect(result.success).toBe(true);
      const lcp = result.metrics!.find((m) => m.name === "LCP");
      const inp = result.metrics!.find((m) => m.name === "INP");
      const cls = result.metrics!.find((m) => m.name === "CLS");
      expect(lcp!.rating).toBe("needs-improvement");
      expect(inp!.rating).toBe("good");
      expect(cls!.rating).toBe("poor");
    });
  });

  // -------------------------------------------------------------------------
  // Individual metric getters
  // -------------------------------------------------------------------------
  describe("getLCP", () => {
    it("should return a MetricReport when tracking is allowed", async () => {
      const lcpMetric = makeMetric("LCP", 1500, "good");
      mockOnLCP.mockImplementation((cb) => cb(lcpMetric));

      const result = await getLCP();

      expect(result).not.toBeNull();
      expect(result!.name).toBe("LCP");
      expect(result!.value).toBe(1500);
      expect(result!.rating).toBe("good");
    });

    it("should return null when navigator.doNotTrack is '1'", async () => {
      const restore = setDoNotTrack("1");
      try {
        const result = await getLCP();
        expect(result).toBeNull();
        expect(mockOnLCP).not.toHaveBeenCalled();
      } finally {
        restore();
      }
    });
  });

  describe("getINP", () => {
    it("should return a MetricReport when tracking is allowed", async () => {
      const inpMetric = makeMetric("INP", 100, "good");
      mockOnINP.mockImplementation((cb) => cb(inpMetric));

      const result = await getINP();

      expect(result).not.toBeNull();
      expect(result!.name).toBe("INP");
      expect(result!.value).toBe(100);
      expect(result!.rating).toBe("good");
    });

    it("should return null when navigator.doNotTrack is '1'", async () => {
      const restore = setDoNotTrack("1");
      try {
        const result = await getINP();
        expect(result).toBeNull();
        expect(mockOnINP).not.toHaveBeenCalled();
      } finally {
        restore();
      }
    });
  });

  describe("getCLS", () => {
    it("should return a MetricReport when tracking is allowed", async () => {
      const clsMetric = makeMetric("CLS", 0.05, "good");
      mockOnCLS.mockImplementation((cb) => cb(clsMetric));

      const result = await getCLS();

      expect(result).not.toBeNull();
      expect(result!.name).toBe("CLS");
      expect(result!.value).toBe(0.05);
      expect(result!.rating).toBe("good");
    });

    it("should return null when navigator.doNotTrack is '1'", async () => {
      const restore = setDoNotTrack("1");
      try {
        const result = await getCLS();
        expect(result).toBeNull();
        expect(mockOnCLS).not.toHaveBeenCalled();
      } finally {
        restore();
      }
    });
  });

  // -------------------------------------------------------------------------
  // Error handling
  // -------------------------------------------------------------------------
  describe("Error handling", () => {
    it("should return error when all metric callbacks throw", async () => {
      mockOnLCP.mockImplementation(() => {
        throw new Error("web-vitals LCP error");
      });
      mockOnINP.mockImplementation(() => {
        throw new Error("web-vitals INP error");
      });
      mockOnCLS.mockImplementation(() => {
        throw new Error("web-vitals CLS error");
      });

      const result = await trackWebVitals();
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/web-vitals/i);
    });

    it("should return generic error when a metric throws a non-Error value", async () => {
      mockOnLCP.mockImplementation(() => {
        throw "string error";
      });
      mockOnINP.mockImplementation(() => {
        throw "another error";
      });
      mockOnCLS.mockImplementation(() => {
        throw "cls error";
      });

      const result = await trackWebVitals();
      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to track web vitals");
    });

    it("getLCP should return null when onLCP throws", async () => {
      mockOnLCP.mockImplementation(() => {
        throw new Error("LCP throws");
      });

      const result = await getLCP();
      expect(result).toBeNull();
    });

    it("getINP should return null when onINP throws", async () => {
      mockOnINP.mockImplementation(() => {
        throw new Error("INP throws");
      });

      const result = await getINP();
      expect(result).toBeNull();
    });

    it("getCLS should return null when onCLS throws", async () => {
      mockOnCLS.mockImplementation(() => {
        throw new Error("CLS throws");
      });

      const result = await getCLS();
      expect(result).toBeNull();
    });
  });

  // -------------------------------------------------------------------------
  // Realistic Bali Worker Hub scenarios
  // -------------------------------------------------------------------------
  describe("Realistic Bali Worker Hub scenarios", () => {
    it("should track a fast job-board page load (LCP good)", async () => {
      mockOnLCP.mockImplementation((cb) => cb(makeMetric("LCP", 1800, "good")));
      mockOnINP.mockImplementation((cb) => cb(makeMetric("INP", 120, "good")));
      mockOnCLS.mockImplementation((cb) => cb(makeMetric("CLS", 0.03, "good")));

      const result = await trackWebVitals();

      expect(result.success).toBe(true);
      const lcp = result.metrics!.find((m) => m.name === "LCP")!;
      expect(classifyMetric("LCP", lcp.value)).toBe("good");
    });

    it("should track a slow mobile page load (LCP needs-improvement)", async () => {
      mockOnLCP.mockImplementation((cb) => cb(makeMetric("LCP", 3500, "needs-improvement")));
      mockOnINP.mockImplementation((cb) => cb(makeMetric("INP", 250, "needs-improvement")));
      mockOnCLS.mockImplementation((cb) => cb(makeMetric("CLS", 0.15, "needs-improvement")));

      const result = await trackWebVitals();

      expect(result.success).toBe(true);
      const lcp = result.metrics!.find((m) => m.name === "LCP")!;
      expect(classifyMetric("LCP", lcp.value)).toBe("needs-improvement");
    });

    it("should track a booking confirmation page with poor CLS", async () => {
      mockOnLCP.mockImplementation((cb) => cb(makeMetric("LCP", 2200, "good")));
      mockOnINP.mockImplementation((cb) => cb(makeMetric("INP", 80, "good")));
      mockOnCLS.mockImplementation((cb) => cb(makeMetric("CLS", 0.35, "poor")));

      const result = await trackWebVitals();

      expect(result.success).toBe(true);
      const cls = result.metrics!.find((m) => m.name === "CLS")!;
      expect(classifyMetric("CLS", cls.value)).toBe("poor");
    });

    it("should track a long job-application interaction (INP poor)", async () => {
      mockOnLCP.mockImplementation((cb) => cb(makeMetric("LCP", 2000, "good")));
      mockOnINP.mockImplementation((cb) => cb(makeMetric("INP", 650, "poor")));
      mockOnCLS.mockImplementation((cb) => cb(makeMetric("CLS", 0.08, "good")));

      const result = await trackWebVitals();

      expect(result.success).toBe(true);
      const inp = result.metrics!.find((m) => m.name === "INP")!;
      expect(classifyMetric("INP", inp.value)).toBe("poor");
    });
  });

  // -------------------------------------------------------------------------
  // No PII in metrics
  // -------------------------------------------------------------------------
  describe("No PII in metrics", () => {
    it("MetricReport should not contain PII fields", async () => {
      const lcpMetric = makeMetric("LCP", 1500, "good");
      const inpMetric = makeMetric("INP", 100, "good");
      const clsMetric = makeMetric("CLS", 0.05, "good");

      mockOnLCP.mockImplementation((cb) => cb(lcpMetric));
      mockOnINP.mockImplementation((cb) => cb(inpMetric));
      mockOnCLS.mockImplementation((cb) => cb(clsMetric));

      const result = await trackWebVitals();

      result.metrics!.forEach((metric: MetricReport) => {
        expect(metric).not.toMatchObject(
          expect.objectContaining({ email: expect.anything() }),
        );
        expect(metric).not.toMatchObject(
          expect.objectContaining({ phone: expect.anything() }),
        );
        // Note: 'name' IS a valid field (LCP | INP | CLS), so we don't exclude it here.
        expect(metric).not.toMatchObject(
          expect.objectContaining({ userId: expect.anything() }),
        );
      });
    });

    it("MetricReport id should be non-empty string", async () => {
      const lcpMetric = makeMetric("LCP", 1500, "good");
      const inpMetric = makeMetric("INP", 100, "good");
      const clsMetric = makeMetric("CLS", 0.05, "good");

      mockOnLCP.mockImplementation((cb) => cb(lcpMetric));
      mockOnINP.mockImplementation((cb) => cb(inpMetric));
      mockOnCLS.mockImplementation((cb) => cb(clsMetric));

      const result = await trackWebVitals();

      result.metrics!.forEach((metric: MetricReport) => {
        expect(typeof metric.id).toBe("string");
        expect(metric.id.length).toBeGreaterThan(0);
      });
    });
  });

  // -------------------------------------------------------------------------
  // Edge cases
  // -------------------------------------------------------------------------
  describe("Edge cases", () => {
    it("should handle zero values for all metrics", async () => {
      mockOnLCP.mockImplementation((cb) => cb(makeMetric("LCP", 0, "good")));
      mockOnINP.mockImplementation((cb) => cb(makeMetric("INP", 0, "good")));
      mockOnCLS.mockImplementation((cb) => cb(makeMetric("CLS", 0, "good")));

      const result = await trackWebVitals();

      expect(result.success).toBe(true);
      expect(result.metrics).toHaveLength(3);
    });

    it("should handle very large LCP values", async () => {
      mockOnLCP.mockImplementation((cb) => cb(makeMetric("LCP", 99999, "poor")));
      mockOnINP.mockImplementation((cb) => cb(makeMetric("INP", 100, "good")));
      mockOnCLS.mockImplementation((cb) => cb(makeMetric("CLS", 0.05, "good")));

      const result = await trackWebVitals();

      expect(result.success).toBe(true);
      const lcp = result.metrics!.find((m) => m.name === "LCP");
      expect(lcp!.value).toBe(99999);
    });

    it("should handle very small CLS values", async () => {
      mockOnLCP.mockImplementation((cb) => cb(makeMetric("LCP", 1500, "good")));
      mockOnINP.mockImplementation((cb) => cb(makeMetric("INP", 100, "good")));
      mockOnCLS.mockImplementation((cb) => cb(makeMetric("CLS", 0.001, "good")));

      const result = await trackWebVitals();

      expect(result.success).toBe(true);
      const cls = result.metrics!.find((m) => m.name === "CLS");
      expect(cls!.value).toBe(0.001);
    });

    it("should allow trackWebVitals when doNotTrack is '0' (explicit opt-out)", async () => {
      const restore = setDoNotTrack("0");
      try {
        mockOnLCP.mockImplementation((cb) => cb(makeMetric("LCP", 1500, "good")));
        mockOnINP.mockImplementation((cb) => cb(makeMetric("INP", 100, "good")));
        mockOnCLS.mockImplementation((cb) => cb(makeMetric("CLS", 0.05, "good")));

        const result = await trackWebVitals();
        expect(result.success).toBe(true);
      } finally {
        restore();
      }
    });

    it("should allow trackWebVitals when doNotTrack is null (unspecified)", async () => {
      mockOnLCP.mockImplementation((cb) => cb(makeMetric("LCP", 1500, "good")));
      mockOnINP.mockImplementation((cb) => cb(makeMetric("INP", 100, "good")));
      mockOnCLS.mockImplementation((cb) => cb(makeMetric("CLS", 0.05, "good")));

      const result = await trackWebVitals();
      expect(result.success).toBe(true);
    });

    it("should allow trackWebVitals when both DNT flags are set to '0'", async () => {
      const restoreNavigator = setDoNotTrack("0");
      const restoreWindow = setWindowDoNotTrack("0");
      try {
        mockOnLCP.mockImplementation((cb) => cb(makeMetric("LCP", 1500, "good")));
        mockOnINP.mockImplementation((cb) => cb(makeMetric("INP", 100, "good")));
        mockOnCLS.mockImplementation((cb) => cb(makeMetric("CLS", 0.05, "good")));

        const result = await trackWebVitals();
        expect(result.success).toBe(true);
      } finally {
        restoreNavigator();
        restoreWindow();
      }
    });

    it("should handle negative metric values if browser reports them", async () => {
      mockOnLCP.mockImplementation((cb) =>
        cb({ ...makeMetric("LCP", 1500, "good"), value: -100, delta: -100 }),
      );
      mockOnINP.mockImplementation((cb) => cb(makeMetric("INP", 100, "good")));
      mockOnCLS.mockImplementation((cb) => cb(makeMetric("CLS", 0.05, "good")));

      const result = await trackWebVitals();
      expect(result.success).toBe(true);
    });
  });
});
