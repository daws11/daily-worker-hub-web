/**
 * Analytics Events Unit Tests
 *
 * Tests Vercel Analytics tracking wrappers in lib/analytics/events.ts:
 * - Browser context guard (rejects server-side calls)
 * - Do Not Track (DNT) compliance
 * - Successful tracking paths
 * - Error handling when analyticsTrack throws
 * - Correct event names and payload properties
 *
 * Strategy: Mock @vercel/analytics entirely. happy-dom provides window/navigator
 * globals so DNT guards can be exercised in the test environment.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Mock @vercel/analytics before importing the module under test
// vi.hoisted() is hoisted alongside vi.mock so the mock function is shared
// between the factory (used by the mocked module) and test code (which
// configures mockReturnValue / mockImplementation).
// ---------------------------------------------------------------------------

const { mockAnalyticsTrack } = vi.hoisted(() => ({
  mockAnalyticsTrack: vi.fn(),
}));

vi.mock("@vercel/analytics", () => ({
  track: mockAnalyticsTrack,
}));

// ---------------------------------------------------------------------------
// Import the module under test
// ---------------------------------------------------------------------------

import {
  trackRegistration,
  trackLogin,
  trackBookingCreated,
  trackPaymentSuccess,
  trackJobApplication,
  trackReviewSubmitted,
  type RegistrationRole,
  type LoginMethod,
} from "../events";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Simulate server context by deleting the `window` property that happy-dom injects.
 * In happy-dom, `window` is a global. We delete it to mimic SSR (server context).
 */
function simulateServerContext() {
  const realWindow = globalThis.window;
  // @ts-expect-error – intentionally removing window to simulate server env
  delete globalThis.window;
  return () => {
    // @ts-expect-error – restore
    globalThis.window = realWindow;
  };
}

/**
 * Simulate Do Not Track being enabled via navigator.doNotTrack.
 * happy-dom sets doNotTrack to "unspecified" by default.
 */
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

/** Simulate window.doNotTrack separately from navigator */
function setWindowDoNotTrack(value: "1" | "0" | null) {
  const win = globalThis.window as Window & { doNotTrack?: string | null };
  const prev = win?.doNotTrack;
  if (win) win.doNotTrack = value ?? undefined;
  return () => {
    if (win) win.doNotTrack = prev ?? undefined;
  };
}

// ---------------------------------------------------------------------------
// Reset mocks before each test
// ---------------------------------------------------------------------------

beforeEach(() => {
  vi.clearAllMocks();
  // Ensure DNT is off / unspecified in happy-dom so default state = tracking allowed
  Object.defineProperty(navigator, "doNotTrack", {
    value: null,
    configurable: true,
  });
  const win = globalThis.window as Window & { doNotTrack?: string | null };
  if (win) win.doNotTrack = undefined;
});

afterEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Analytics Events", () => {
  // -------------------------------------------------------------------------
  // Browser Context Guard
  // -------------------------------------------------------------------------
  describe("Browser context guard", () => {
    it("should reject tracking in server context (trackRegistration)", () => {
      const restore = simulateServerContext();
      try {
        const result = trackRegistration("worker");
        expect(result.success).toBe(false);
        expect(result.error).toBe("Cannot track in server context");
      } finally {
        restore();
      }
    });

    it("should reject tracking in server context (trackLogin)", () => {
      const restore = simulateServerContext();
      try {
        const result = trackLogin("email");
        expect(result.success).toBe(false);
        expect(result.error).toBe("Cannot track in server context");
      } finally {
        restore();
      }
    });

    it("should reject tracking in server context (trackBookingCreated)", () => {
      const restore = simulateServerContext();
      try {
        const result = trackBookingCreated({ bookingId: "b-1", amount: 150000 });
        expect(result.success).toBe(false);
        expect(result.error).toBe("Cannot track in server context");
      } finally {
        restore();
      }
    });

    it("should reject tracking in server context (trackPaymentSuccess)", () => {
      const restore = simulateServerContext();
      try {
        const result = trackPaymentSuccess({
          bookingId: "b-1",
          amount: 150000,
          method: "bank_transfer",
        });
        expect(result.success).toBe(false);
        expect(result.error).toBe("Cannot track in server context");
      } finally {
        restore();
      }
    });

    it("should reject tracking in server context (trackJobApplication)", () => {
      const restore = simulateServerContext();
      try {
        const result = trackJobApplication({ workerId: "w-1", jobId: "j-1" });
        expect(result.success).toBe(false);
        expect(result.error).toBe("Cannot track in server context");
      } finally {
        restore();
      }
    });

    it("should reject tracking in server context (trackReviewSubmitted)", () => {
      const restore = simulateServerContext();
      try {
        const result = trackReviewSubmitted({ bookingId: "b-1", rating: 5 });
        expect(result.success).toBe(false);
        expect(result.error).toBe("Cannot track in server context");
      } finally {
        restore();
      }
    });
  });

  // -------------------------------------------------------------------------
  // Do Not Track Guard – navigator.doNotTrack
  // -------------------------------------------------------------------------
  describe("Do Not Track – navigator.doNotTrack", () => {
    it("should skip trackRegistration when navigator.doNotTrack is '1'", () => {
      const restore = setDoNotTrack("1");
      try {
        const result = trackRegistration("worker");
        expect(result.success).toBe(false);
        expect(result.error).toBe("User has Do Not Track enabled");
        expect(mockAnalyticsTrack).not.toHaveBeenCalled();
      } finally {
        restore();
      }
    });

    it("should skip trackLogin when navigator.doNotTrack is '1'", () => {
      const restore = setDoNotTrack("1");
      try {
        const result = trackLogin("phone");
        expect(result.success).toBe(false);
        expect(result.error).toBe("User has Do Not Track enabled");
        expect(mockAnalyticsTrack).not.toHaveBeenCalled();
      } finally {
        restore();
      }
    });

    it("should skip trackBookingCreated when navigator.doNotTrack is '1'", () => {
      const restore = setDoNotTrack("1");
      try {
        const result = trackBookingCreated({ bookingId: "b-1", amount: 200000 });
        expect(result.success).toBe(false);
        expect(result.error).toBe("User has Do Not Track enabled");
        expect(mockAnalyticsTrack).not.toHaveBeenCalled();
      } finally {
        restore();
      }
    });

    it("should skip trackPaymentSuccess when navigator.doNotTrack is '1'", () => {
      const restore = setDoNotTrack("1");
      try {
        const result = trackPaymentSuccess({
          bookingId: "b-1",
          amount: 200000,
          method: "ewallet",
        });
        expect(result.success).toBe(false);
        expect(result.error).toBe("User has Do Not Track enabled");
        expect(mockAnalyticsTrack).not.toHaveBeenCalled();
      } finally {
        restore();
      }
    });

    it("should skip trackJobApplication when navigator.doNotTrack is '1'", () => {
      const restore = setDoNotTrack("1");
      try {
        const result = trackJobApplication({ workerId: "w-1", jobId: "j-1" });
        expect(result.success).toBe(false);
        expect(result.error).toBe("User has Do Not Track enabled");
        expect(mockAnalyticsTrack).not.toHaveBeenCalled();
      } finally {
        restore();
      }
    });

    it("should skip trackReviewSubmitted when navigator.doNotTrack is '1'", () => {
      const restore = setDoNotTrack("1");
      try {
        const result = trackReviewSubmitted({ bookingId: "b-1", rating: 4 });
        expect(result.success).toBe(false);
        expect(result.error).toBe("User has Do Not Track enabled");
        expect(mockAnalyticsTrack).not.toHaveBeenCalled();
      } finally {
        restore();
      }
    });
  });

  // -------------------------------------------------------------------------
  // Do Not Track Guard – window.doNotTrack
  // -------------------------------------------------------------------------
  describe("Do Not Track – window.doNotTrack", () => {
    it("should skip trackRegistration when window.doNotTrack is '1'", () => {
      const restore = setWindowDoNotTrack("1");
      try {
        const result = trackRegistration("business");
        expect(result.success).toBe(false);
        expect(result.error).toBe("User has Do Not Track enabled");
        expect(mockAnalyticsTrack).not.toHaveBeenCalled();
      } finally {
        restore();
      }
    });

    it("should allow trackLogin when window.doNotTrack is '0'", () => {
      const restore = setWindowDoNotTrack("0");
      try {
        mockAnalyticsTrack.mockImplementation(() => {});
        const result = trackLogin("google");
        expect(result.success).toBe(true);
        expect(mockAnalyticsTrack).toHaveBeenCalled();
      } finally {
        restore();
      }
    });
  });

  // -------------------------------------------------------------------------
  // Successful Tracking – trackRegistration
  // -------------------------------------------------------------------------
  describe("trackRegistration", () => {
    it("should call analyticsTrack with 'registration' event and worker role", () => {
      mockAnalyticsTrack.mockImplementation(() => {});
      const result = trackRegistration("worker");
      expect(result.success).toBe(true);
      expect(mockAnalyticsTrack).toHaveBeenCalledTimes(1);
      expect(mockAnalyticsTrack).toHaveBeenCalledWith("registration", { role: "worker" });
    });

    it("should call analyticsTrack with 'registration' event and business role", () => {
      mockAnalyticsTrack.mockImplementation(() => {});
      const result = trackRegistration("business");
      expect(result.success).toBe(true);
      expect(mockAnalyticsTrack).toHaveBeenCalledWith("registration", { role: "business" });
    });

    it("should return error when analyticsTrack throws", () => {
      mockAnalyticsTrack.mockImplementation(() => {
        throw new Error("Analytics SDK error");
      });
      const result = trackRegistration("worker");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Analytics SDK error");
    });

    it("should return generic error when analyticsTrack throws without message", () => {
      mockAnalyticsTrack.mockImplementation(() => {
        throw "string error";
      });
      const result = trackRegistration("worker");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to track registration");
    });
  });

  // -------------------------------------------------------------------------
  // Successful Tracking – trackLogin
  // -------------------------------------------------------------------------
  describe("trackLogin", () => {
    it("should call analyticsTrack with 'login' event and email method", () => {
      mockAnalyticsTrack.mockImplementation(() => {});
      const result = trackLogin("email");
      expect(result.success).toBe(true);
      expect(mockAnalyticsTrack).toHaveBeenCalledWith("login", { method: "email" });
    });

    it("should call analyticsTrack with 'login' event and phone method", () => {
      mockAnalyticsTrack.mockImplementation(() => {});
      const result = trackLogin("phone");
      expect(result.success).toBe(true);
      expect(mockAnalyticsTrack).toHaveBeenCalledWith("login", { method: "phone" });
    });

    it("should call analyticsTrack with 'login' event and google method", () => {
      mockAnalyticsTrack.mockImplementation(() => {});
      const result = trackLogin("google");
      expect(result.success).toBe(true);
      expect(mockAnalyticsTrack).toHaveBeenCalledWith("login", { method: "google" });
    });

    it("should return error when analyticsTrack throws", () => {
      mockAnalyticsTrack.mockImplementation(() => {
        throw new Error("Network timeout");
      });
      const result = trackLogin("email");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Network timeout");
    });

    it("should return generic error when analyticsTrack throws without message", () => {
      mockAnalyticsTrack.mockImplementation(() => {
        throw { code: 500 };
      });
      const result = trackLogin("email");
      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to track login");
    });
  });

  // -------------------------------------------------------------------------
  // Successful Tracking – trackBookingCreated
  // -------------------------------------------------------------------------
  describe("trackBookingCreated", () => {
    it("should call analyticsTrack with 'booking_created' event and correct payload", () => {
      mockAnalyticsTrack.mockImplementation(() => {});
      const result = trackBookingCreated({
        bookingId: "booking-abc-123",
        amount: 150000,
      });
      expect(result.success).toBe(true);
      expect(mockAnalyticsTrack).toHaveBeenCalledWith("booking_created", {
        booking_id: "booking-abc-123",
        amount: 150000,
      });
    });

    it("should include correct snake_case payload keys", () => {
      mockAnalyticsTrack.mockImplementation(() => {});
      trackBookingCreated({ bookingId: "b-999", amount: 500000 });
      expect(mockAnalyticsTrack).toHaveBeenCalledWith(
        "booking_created",
        expect.objectContaining({ booking_id: "b-999", amount: 500000 }),
      );
    });

    it("should return error when analyticsTrack throws", () => {
      mockAnalyticsTrack.mockImplementation(() => {
        throw new Error("Tracking endpoint unavailable");
      });
      const result = trackBookingCreated({ bookingId: "b-1", amount: 100000 });
      expect(result.success).toBe(false);
      expect(result.error).toBe("Tracking endpoint unavailable");
    });

    it("should return generic error when analyticsTrack throws without message", () => {
      mockAnalyticsTrack.mockImplementation(() => {
        throw null;
      });
      const result = trackBookingCreated({ bookingId: "b-1", amount: 100000 });
      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to track booking_created");
    });
  });

  // -------------------------------------------------------------------------
  // Successful Tracking – trackPaymentSuccess
  // -------------------------------------------------------------------------
  describe("trackPaymentSuccess", () => {
    it("should call analyticsTrack with 'payment_success' event and correct payload", () => {
      mockAnalyticsTrack.mockImplementation(() => {});
      const result = trackPaymentSuccess({
        bookingId: "booking-xyz",
        amount: 250000,
        method: "bank_transfer",
      });
      expect(result.success).toBe(true);
      expect(mockAnalyticsTrack).toHaveBeenCalledWith("payment_success", {
        booking_id: "booking-xyz",
        amount: 250000,
        payment_method: "bank_transfer",
      });
    });

    it("should handle ewallet payment method", () => {
      mockAnalyticsTrack.mockImplementation(() => {});
      const result = trackPaymentSuccess({
        bookingId: "b-1",
        amount: 300000,
        method: "ewallet",
      });
      expect(result.success).toBe(true);
      expect(mockAnalyticsTrack).toHaveBeenCalledWith("payment_success", {
        booking_id: "b-1",
        amount: 300000,
        payment_method: "ewallet",
      });
    });

    it("should return error when analyticsTrack throws", () => {
      mockAnalyticsTrack.mockImplementation(() => {
        throw new Error("Payment tracker failed");
      });
      const result = trackPaymentSuccess({
        bookingId: "b-1",
        amount: 100000,
        method: "card",
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe("Payment tracker failed");
    });

    it("should return generic error when analyticsTrack throws without message", () => {
      mockAnalyticsTrack.mockImplementation(() => {
        throw undefined;
      });
      const result = trackPaymentSuccess({
        bookingId: "b-1",
        amount: 100000,
        method: "card",
      });
      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to track payment_success");
    });
  });

  // -------------------------------------------------------------------------
  // Successful Tracking – trackJobApplication
  // -------------------------------------------------------------------------
  describe("trackJobApplication", () => {
    it("should call analyticsTrack with 'job_application' event and correct payload", () => {
      mockAnalyticsTrack.mockImplementation(() => {});
      const result = trackJobApplication({
        workerId: "worker-123",
        jobId: "job-456",
      });
      expect(result.success).toBe(true);
      expect(mockAnalyticsTrack).toHaveBeenCalledWith("job_application", {
        worker_id: "worker-123",
        job_id: "job-456",
      });
    });

    it("should return error when analyticsTrack throws", () => {
      mockAnalyticsTrack.mockImplementation(() => {
        throw new Error("Application tracking error");
      });
      const result = trackJobApplication({ workerId: "w-1", jobId: "j-1" });
      expect(result.success).toBe(false);
      expect(result.error).toBe("Application tracking error");
    });

    it("should return generic error when analyticsTrack throws without message", () => {
      // Throw a non-Error value to exercise the generic fallback path.
      // Throwing `new Error()` without a message still has err.message = ""
      // (instanceof Error is true), so it does not reach the fallback.
      mockAnalyticsTrack.mockImplementation(() => {
        throw "analytics_error";
      });
      const result = trackJobApplication({ workerId: "w-1", jobId: "j-1" });
      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to track job_application");
    });
  });

  // -------------------------------------------------------------------------
  // Successful Tracking – trackReviewSubmitted
  // -------------------------------------------------------------------------
  describe("trackReviewSubmitted", () => {
    it("should call analyticsTrack with 'review_submitted' event and correct payload", () => {
      mockAnalyticsTrack.mockImplementation(() => {});
      const result = trackReviewSubmitted({
        bookingId: "booking-review-001",
        rating: 5,
      });
      expect(result.success).toBe(true);
      expect(mockAnalyticsTrack).toHaveBeenCalledWith("review_submitted", {
        booking_id: "booking-review-001",
        rating: 5,
      });
    });

    it("should handle rating of 1 (minimum)", () => {
      mockAnalyticsTrack.mockImplementation(() => {});
      const result = trackReviewSubmitted({ bookingId: "b-1", rating: 1 });
      expect(result.success).toBe(true);
      expect(mockAnalyticsTrack).toHaveBeenCalledWith("review_submitted", {
        booking_id: "b-1",
        rating: 1,
      });
    });

    it("should return error when analyticsTrack throws", () => {
      mockAnalyticsTrack.mockImplementation(() => {
        throw new Error("Review tracker failed");
      });
      const result = trackReviewSubmitted({ bookingId: "b-1", rating: 4 });
      expect(result.success).toBe(false);
      expect(result.error).toBe("Review tracker failed");
    });

    it("should return generic error when analyticsTrack throws without message", () => {
      mockAnalyticsTrack.mockImplementation(() => {
        throw "oops";
      });
      const result = trackReviewSubmitted({ bookingId: "b-1", rating: 3 });
      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to track review_submitted");
    });
  });

  // -------------------------------------------------------------------------
  // DNT takes precedence over successful analyticsTrack call
  // -------------------------------------------------------------------------
  describe("DNT precedence over analyticsTrack", () => {
    it("should not call analyticsTrack even if DNT is enabled", () => {
      const restoreNavigator = setDoNotTrack("1");
      try {
        const result = trackBookingCreated({ bookingId: "b-1", amount: 100000 });
        expect(result.success).toBe(false);
        expect(mockAnalyticsTrack).not.toHaveBeenCalled();
      } finally {
        restoreNavigator();
      }
    });
  });

  // -------------------------------------------------------------------------
  // Result Types
  // -------------------------------------------------------------------------
  describe("Result types", () => {
    it("should always return an object with a 'success' boolean field", () => {
      mockAnalyticsTrack.mockImplementation(() => {});

      expect(trackRegistration("worker")).toMatchObject({ success: true });
      expect(trackLogin("email")).toMatchObject({ success: true });
      expect(trackBookingCreated({ bookingId: "b-1", amount: 1 })).toMatchObject({
        success: true,
      });
      expect(
        trackPaymentSuccess({ bookingId: "b-1", amount: 1, method: "card" }),
      ).toMatchObject({ success: true });
      expect(trackJobApplication({ workerId: "w-1", jobId: "j-1" })).toMatchObject({
        success: true,
      });
      expect(trackReviewSubmitted({ bookingId: "b-1", rating: 5 })).toMatchObject({
        success: true,
      });
    });

    it("should return error string (not object) on failure", () => {
      const restore = simulateServerContext();
      try {
        const result = trackRegistration("worker");
        expect(result.success).toBe(false);
        expect(typeof result.error).toBe("string");
        expect(result.error!.length).toBeGreaterThan(0);
      } finally {
        restore();
      }
    });
  });

  // -------------------------------------------------------------------------
  // Edge Cases
  // -------------------------------------------------------------------------
  describe("Edge cases", () => {
    it("should handle zero amount for booking", () => {
      mockAnalyticsTrack.mockImplementation(() => {});
      const result = trackBookingCreated({ bookingId: "b-free", amount: 0 });
      expect(result.success).toBe(true);
      expect(mockAnalyticsTrack).toHaveBeenCalledWith("booking_created", {
        booking_id: "b-free",
        amount: 0,
      });
    });

    it("should handle zero amount for payment", () => {
      mockAnalyticsTrack.mockImplementation(() => {});
      const result = trackPaymentSuccess({
        bookingId: "b-free",
        amount: 0,
        method: "waived",
      });
      expect(result.success).toBe(true);
      expect(mockAnalyticsTrack).toHaveBeenCalledWith("payment_success", {
        booking_id: "b-free",
        amount: 0,
        payment_method: "waived",
      });
    });

    it("should handle large booking ID strings", () => {
      mockAnalyticsTrack.mockImplementation(() => {});
      const longId = "b-" + "x".repeat(200);
      const result = trackBookingCreated({ bookingId: longId, amount: 500000 });
      expect(result.success).toBe(true);
      expect(mockAnalyticsTrack).toHaveBeenCalledWith("booking_created", {
        booking_id: longId,
        amount: 500000,
      });
    });

    it("should handle non-Error thrown values gracefully (null)", () => {
      mockAnalyticsTrack.mockImplementation(() => {
        throw null;
      });
      const result = trackRegistration("worker");
      expect(result.success).toBe(false);
      expect(typeof result.error).toBe("string");
    });

    it("should handle non-Error thrown values gracefully (undefined)", () => {
      mockAnalyticsTrack.mockImplementation(() => {
        throw undefined;
      });
      const result = trackLogin("email");
      expect(result.success).toBe(false);
      expect(typeof result.error).toBe("string");
    });

    it("should handle non-Error thrown values gracefully (plain object)", () => {
      mockAnalyticsTrack.mockImplementation(() => {
        throw { reason: "limit exceeded" };
      });
      const result = trackBookingCreated({ bookingId: "b-1", amount: 100 });
      expect(result.success).toBe(false);
      expect(typeof result.error).toBe("string");
    });
  });

  // -------------------------------------------------------------------------
  // No PII in event payloads
  // -------------------------------------------------------------------------
  describe("No PII in event payloads", () => {
    it("registration payload should not contain email, phone, or name", () => {
      mockAnalyticsTrack.mockImplementation(() => {});
      trackRegistration("worker");
      const [, payload] = mockAnalyticsTrack.mock.calls[0];
      expect(payload).not.toMatchObject(
        expect.objectContaining({ email: expect.anything() }),
      );
      expect(payload).not.toMatchObject(
        expect.objectContaining({ phone: expect.anything() }),
      );
      expect(payload).not.toMatchObject(
        expect.objectContaining({ name: expect.anything() }),
      );
    });

    it("login payload should not contain email, phone, or name", () => {
      mockAnalyticsTrack.mockImplementation(() => {});
      trackLogin("email");
      const [, payload] = mockAnalyticsTrack.mock.calls[0];
      expect(payload).not.toMatchObject(
        expect.objectContaining({ email: expect.anything() }),
      );
      expect(payload).not.toMatchObject(
        expect.objectContaining({ phone: expect.anything() }),
      );
    });

    it("booking_created payload should not contain PII fields", () => {
      mockAnalyticsTrack.mockImplementation(() => {});
      trackBookingCreated({ bookingId: "b-1", amount: 100000 });
      const [, payload] = mockAnalyticsTrack.mock.calls[0];
      expect(payload).not.toMatchObject(
        expect.objectContaining({ email: expect.anything() }),
      );
      expect(payload).not.toMatchObject(
        expect.objectContaining({ phone: expect.anything() }),
      );
      expect(payload).not.toMatchObject(
        expect.objectContaining({ name: expect.anything() }),
      );
    });
  });

  // -------------------------------------------------------------------------
  // Realistic Bali Worker Hub Scenarios
  // -------------------------------------------------------------------------
  describe("Realistic Bali Worker Hub scenarios", () => {
    it("should track a worker registration", () => {
      mockAnalyticsTrack.mockImplementation(() => {});
      const result = trackRegistration("worker");
      expect(result.success).toBe(true);
      expect(mockAnalyticsTrack).toHaveBeenCalledWith("registration", { role: "worker" });
    });

    it("should track a business registration", () => {
      mockAnalyticsTrack.mockImplementation(() => {});
      const result = trackRegistration("business");
      expect(result.success).toBe(true);
      expect(mockAnalyticsTrack).toHaveBeenCalledWith("registration", { role: "business" });
    });

    it("should track a Google login for a worker", () => {
      mockAnalyticsTrack.mockImplementation(() => {});
      const result = trackLogin("google");
      expect(result.success).toBe(true);
      expect(mockAnalyticsTrack).toHaveBeenCalledWith("login", { method: "google" });
    });

    it("should track a booking created for Rp 200,000 daily wage", () => {
      mockAnalyticsTrack.mockImplementation(() => {});
      const result = trackBookingCreated({
        bookingId: "booking-001",
        amount: 200000,
      });
      expect(result.success).toBe(true);
      expect(mockAnalyticsTrack).toHaveBeenCalledWith("booking_created", {
        booking_id: "booking-001",
        amount: 200000,
      });
    });

    it("should track a successful bank transfer payment", () => {
      mockAnalyticsTrack.mockImplementation(() => {});
      const result = trackPaymentSuccess({
        bookingId: "booking-002",
        amount: 200000,
        method: "bank_transfer",
      });
      expect(result.success).toBe(true);
      expect(mockAnalyticsTrack).toHaveBeenCalledWith("payment_success", {
        booking_id: "booking-002",
        amount: 200000,
        payment_method: "bank_transfer",
      });
    });

    it("should track a worker applying for a job", () => {
      mockAnalyticsTrack.mockImplementation(() => {});
      const result = trackJobApplication({
        workerId: "worker-abc",
        jobId: "job-xyz",
      });
      expect(result.success).toBe(true);
      expect(mockAnalyticsTrack).toHaveBeenCalledWith("job_application", {
        worker_id: "worker-abc",
        job_id: "job-xyz",
      });
    });

    it("should track a 5-star review for a booking", () => {
      mockAnalyticsTrack.mockImplementation(() => {});
      const result = trackReviewSubmitted({
        bookingId: "booking-003",
        rating: 5,
      });
      expect(result.success).toBe(true);
      expect(mockAnalyticsTrack).toHaveBeenCalledWith("review_submitted", {
        booking_id: "booking-003",
        rating: 5,
      });
    });
  });
});
