/**
 * Booking Actions Unit Tests
 *
 * Tests for booking-related server actions:
 * - createBooking
 * - acceptBooking
 * - rejectBooking
 * - getWorkerBooking
 * - getBusinessBooking
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock supabase server client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn(),
        }),
      }),
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn(),
        }),
      }),
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn(),
          }),
        }),
      }),
    }),
  }),
}));

// Mock compliance check
vi.mock("@/lib/actions/compliance", () => ({
  checkComplianceBeforeAccept: vi.fn().mockResolvedValue({
    success: true,
    canAccept: true,
    daysWorked: 0,
    data: { status: "active", daysWorked: 0, canAccept: true },
    message: "Compliant",
  }),
}));

import { createClient } from "@/lib/supabase/server";
import {
  createBooking,
  acceptBooking,
  rejectBooking,
  getWorkerBooking,
  getBusinessBooking,
} from "@/lib/actions/bookings";

describe("Booking Actions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // ─── createBooking ─────────────────────────────────────────────────────

  describe("createBooking", () => {
    it("should return failure when job not found", async () => {
      vi.mocked(createClient).mockResolvedValue({
        from: () => ({
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: null,
                error: { code: "PGRST116", message: "Not found" },
              }),
            }),
          }),
        }),
      } as any);

      const result = await createBooking("job-none", "worker-789", "business-101");

      expect(result.success).toBe(false);
    });

    it("should return failure when database error occurs on booking insert", async () => {
      vi.mocked(createClient).mockResolvedValue({
        from: (table: string) => {
          if (table === "jobs") {
            return {
              select: () => ({
                eq: () => ({
                  single: () => Promise.resolve({
                    data: { id: "job-456", business_id: "business-101" },
                    error: null,
                  }),
                }),
              }),
            };
          }
          if (table === "bookings") {
            return {
              select: () => ({
                eq: () => ({
                  single: () => Promise.resolve({
                    data: null,
                    error: { code: "PGRST116" },
                  }),
                }),
              }),
              insert: () => ({
                select: () => ({
                  single: () => Promise.resolve({
                    data: null,
                    error: { message: "Database error" },
                  }),
                }),
              }),
            };
          }
          return {};
        },
      } as any);

      const result = await createBooking("job-456", "worker-789", "business-101");

      expect(result.success).toBe(false);
      expect(result.error).toContain("booking");
    });

    it("should block booking due to PP 35/2021 compliance", async () => {
      // Override compliance mock for this test
      const { checkComplianceBeforeAccept } = await import("@/lib/actions/compliance");
      vi.mocked(checkComplianceBeforeAccept).mockResolvedValueOnce({
        success: true,
        canAccept: false,
        data: { status: "blocked", daysWorked: 21, warningLevel: "blocked", message: "PP 35/2021 violation" },
        error: "Limit reached",
      });

      vi.mocked(createClient).mockResolvedValue({
        from: (table: string) => {
          if (table === "jobs") {
            return {
              select: () => ({
                eq: () => ({
                  single: () => Promise.resolve({
                    data: { id: "job-456", business_id: "business-101" },
                    error: null,
                  }),
                }),
              }),
            };
          }
          return {
            select: () => ({
              eq: () => ({
                single: () => Promise.resolve({
                  data: null,
                  error: { code: "PGRST116" },
                }),
              }),
            }),
          };
        },
      } as any);

      const result = await createBooking("job-456", "worker-789", "business-101");

      expect(result.success).toBe(false);
      expect(result.complianceStatus?.canAccept).toBe(false);
      expect(result.complianceStatus?.daysWorked).toBe(21);
    });
  });

  // ─── acceptBooking ─────────────────────────────────────────────────────

  describe("acceptBooking", () => {
    it("should return failure when booking not found", async () => {
      vi.mocked(createClient).mockResolvedValue({
        from: () => ({
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: null,
                error: { code: "PGRST116", message: "Not found" },
              }),
            }),
          }),
        }),
      } as any);

      const result = await acceptBooking("booking-none", "business-101");

      expect(result.success).toBe(false);
    });
  });

  // ─── rejectBooking ─────────────────────────────────────────────────────

  describe("rejectBooking", () => {
    it("should return failure when booking not found", async () => {
      vi.mocked(createClient).mockResolvedValue({
        from: () => ({
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: null,
                error: { code: "PGRST116", message: "Not found" },
              }),
            }),
          }),
        }),
      } as any);

      const result = await rejectBooking("booking-123", "business-101");

      expect(result.success).toBe(false);
    });
  });

  // ─── getWorkerBooking ──────────────────────────────────────────────────

  describe("getWorkerBooking", () => {
    it("should return failure when booking not found", async () => {
      vi.mocked(createClient).mockResolvedValue({
        from: () => ({
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: null,
                error: { code: "PGRST116", message: "Not found" },
              }),
            }),
          }),
        }),
      } as any);

      const result = await getWorkerBooking("booking-none", "worker-789");

      expect(result.success).toBe(false);
    });
  });

  // ─── getBusinessBooking ────────────────────────────────────────────────

  describe("getBusinessBooking", () => {
    it("should return failure when booking not found", async () => {
      vi.mocked(createClient).mockResolvedValue({
        from: () => ({
          select: () => ({
            eq: () => ({
              single: () => Promise.resolve({
                data: null,
                error: { code: "PGRST116", message: "Not found" },
              }),
            }),
          }),
        }),
      } as any);

      const result = await getBusinessBooking("booking-none", "business-101");

      expect(result.success).toBe(false);
    });
  });
});
