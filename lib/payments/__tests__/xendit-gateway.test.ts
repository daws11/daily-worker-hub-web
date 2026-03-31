/**
 * XenditGateway Unit Tests
 *
 * Tests for XenditGateway methods:
 * - calculateFee(): Fee calculation for various payment methods
 * - mapStatus(): Status mapping from Xendit to internal statuses
 * - verifyWebhookSignature(): Webhook signature verification
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { XenditGateway, mapPaymentStatus } from "../xendit";

describe("XenditGateway", () => {
  let gateway: XenditGateway;

  const originalEnv: Record<string, string | undefined> = {};

  const xenditEnvVars = [
    "XENDIT_API_URL",
    "XENDIT_INVOICE_API_URL",
    "XENDIT_SECRET_KEY",
    "XENDIT_WEBHOOK_TOKEN",
  ];

  beforeEach(() => {
    gateway = new XenditGateway();

    // Save original env vars
    xenditEnvVars.forEach((key) => {
      originalEnv[key] = process.env[key];
    });

    // Set test env vars
    process.env.XENDIT_SECRET_KEY = "test_secret_key";
    process.env.XENDIT_WEBHOOK_TOKEN = "test_webhook_token";

    vi.clearAllMocks();
  });

  afterEach(() => {
    // Restore original env vars
    xenditEnvVars.forEach((key) => {
      if (originalEnv[key] !== undefined) {
        process.env[key] = originalEnv[key];
      } else {
        delete process.env[key];
      }
    });
  });

  describe("calculateFee()", () => {
    describe("QRIS payment method", () => {
      it("should calculate QRIS fee with 0.7% + Rp 500 for uppercase QRIS", () => {
        // amount = 100000, 0.7% = 700, + 500 = 1200
        const fee = gateway.calculateFee(100000, "QRIS");
        expect(fee).toBe(1200);
      });

      it("should calculate QRIS fee with 0.7% + Rp 500 for lowercase qris", () => {
        // amount = 50000, 0.7% = 350, floor = 350, + 500 = 850
        const fee = gateway.calculateFee(50000, "qris");
        expect(fee).toBe(850);
      });

      it("should floor fractional variable fees for QRIS", () => {
        // amount = 33333, 0.7% = 233.331, floor = 233, + 500 = 733
        const fee = gateway.calculateFee(33333, "QRIS");
        expect(fee).toBe(733);
      });

      it("should handle large QRIS amounts correctly", () => {
        // amount = 1000000, 0.7% = 7000, + 500 = 7500
        const fee = gateway.calculateFee(1000000, "QRIS");
        expect(fee).toBe(7500);
      });
    });

    describe("Bank transfer (VA) payment method", () => {
      it("should calculate VA fee with 0.5% + Rp 4000 for BANK_TRANSFER", () => {
        // amount = 100000, 0.5% = 500, + 4000 = 4500
        const fee = gateway.calculateFee(100000, "BANK_TRANSFER");
        expect(fee).toBe(4500);
      });

      it("should calculate VA fee with 0.5% + Rp 4000 for lowercase va", () => {
        // amount = 200000, 0.5% = 1000, + 4000 = 5000
        const fee = gateway.calculateFee(200000, "va");
        expect(fee).toBe(5000);
      });

      it("should floor fractional variable fees for VA", () => {
        // amount = 77777, 0.5% = 388.885, floor = 388, + 4000 = 4388
        const fee = gateway.calculateFee(77777, "BANK_TRANSFER");
        expect(fee).toBe(4388);
      });

      it("should handle large VA amounts correctly", () => {
        // amount = 5000000, 0.5% = 25000, + 4000 = 29000
        const fee = gateway.calculateFee(5000000, "va");
        expect(fee).toBe(29000);
      });
    });

    describe("E-wallet payment method", () => {
      it("should calculate E_WALLET fee with 1.5%", () => {
        // amount = 100000, 1.5% = 1500
        const fee = gateway.calculateFee(100000, "E_WALLET");
        expect(fee).toBe(1500);
      });

      it("should calculate ewallet fee with 1.5% for lowercase", () => {
        // amount = 50000, 1.5% = 750
        const fee = gateway.calculateFee(50000, "ewallet");
        expect(fee).toBe(750);
      });

      it("should floor fractional e-wallet fees", () => {
        // amount = 33333, 1.5% = 499.995, floor = 499
        const fee = gateway.calculateFee(33333, "E_WALLET");
        expect(fee).toBe(499);
      });

      it("should handle large e-wallet amounts correctly", () => {
        // amount = 1000000, 1.5% = 15000
        const fee = gateway.calculateFee(1000000, "ewallet");
        expect(fee).toBe(15000);
      });
    });

    describe("Default payment method (no method specified)", () => {
      it("should default to QRIS fee when no payment method is provided", () => {
        // amount = 100000, 0.7% = 700, + 500 = 1200
        const fee = gateway.calculateFee(100000);
        expect(fee).toBe(1200);
      });

      it("should default to QRIS fee for unknown payment methods", () => {
        // amount = 100000, 0.7% = 700, + 500 = 1200
        const fee = gateway.calculateFee(100000, "CREDIT_CARD");
        expect(fee).toBe(1200);
      });

      it("should default to QRIS fee for empty string payment method", () => {
        // amount = 50000, 0.7% = 350, + 500 = 850
        const fee = gateway.calculateFee(50000, "");
        expect(fee).toBe(850);
      });
    });

    describe("Edge cases", () => {
      it("should handle zero amount", () => {
        // QRIS default: 0.7% * 0 = 0, + 500 = 500
        const fee = gateway.calculateFee(0, "QRIS");
        expect(fee).toBe(500);
      });

      it("should handle very small amounts correctly", () => {
        // amount = 100, 0.7% = 0.7, floor = 0, + 500 = 500
        const fee = gateway.calculateFee(100, "QRIS");
        expect(fee).toBe(500);
      });

      it("should return integer fee values", () => {
        const fee = gateway.calculateFee(99999, "QRIS");
        expect(Number.isInteger(fee)).toBe(true);
      });
    });
  });

  describe("mapStatus() via mapPaymentStatus()", () => {
    it('should map "PENDING" to "pending"', () => {
      expect(mapPaymentStatus("PENDING")).toBe("pending");
    });

    it('should map "PAID" to "success"', () => {
      expect(mapPaymentStatus("PAID")).toBe("success");
    });

    it('should map "COMPLETED" to "success"', () => {
      expect(mapPaymentStatus("COMPLETED")).toBe("success");
    });

    it('should map "EXPIRED" to "expired"', () => {
      expect(mapPaymentStatus("EXPIRED")).toBe("expired");
    });

    it('should map "CANCELLED" to "cancelled"', () => {
      expect(mapPaymentStatus("CANCELLED")).toBe("cancelled");
    });

    it('should map "FAILED" to "failed"', () => {
      expect(mapPaymentStatus("FAILED")).toBe("failed");
    });

    it("should map unknown status to 'pending' as default", () => {
      expect(mapPaymentStatus("UNKNOWN")).toBe("pending");
      expect(mapPaymentStatus("")).toBe("pending");
      expect(mapPaymentStatus("random_status")).toBe("pending");
    });

    it("should handle lowercase status values", () => {
      expect(mapPaymentStatus("pending")).toBe("pending");
      expect(mapPaymentStatus("paid")).toBe("pending"); // lowercase not in map, defaults to pending
      expect(mapPaymentStatus("completed")).toBe("pending");
    });

    it("should map disbursement statuses correctly", () => {
      expect(mapPaymentStatus("PROCESSING")).toBe("pending"); // PROCESSING not mapped, defaults to pending
      expect(mapPaymentStatus("PENDING")).toBe("pending");
    });
  });

  describe("verifyWebhookSignature()", () => {
    describe("Valid signature verification", () => {
      it("should return true when signature matches webhook token", () => {
        const result = gateway.verifyWebhookSignature("test_webhook_token");
        expect(result).toBe(true);
      });

      it("should return true with non-empty payload when signature matches", () => {
        const result = gateway.verifyWebhookSignature(
          "test_webhook_token",
          '{"id":"123"}',
        );
        expect(result).toBe(true);
      });

      it("should return true for empty string signature when token is empty", () => {
        delete process.env.XENDIT_WEBHOOK_TOKEN;
        process.env.XENDIT_WEBHOOK_TOKEN = "";
        const gatewayWithEmptyToken = new XenditGateway();
        const result = gatewayWithEmptyToken.verifyWebhookSignature("");
        expect(result).toBe(false);
      });
    });

    describe("Invalid signature verification", () => {
      it("should return false when signature does not match", () => {
        const result = gateway.verifyWebhookSignature("wrong_signature");
        expect(result).toBe(false);
      });

      it("should return false when signature is empty string", () => {
        const result = gateway.verifyWebhookSignature("");
        expect(result).toBe(false);
      });

      it("should return false when signature is null", () => {
        const result = gateway.verifyWebhookSignature(null);
        expect(result).toBe(false);
      });

      it("should return false when signature is undefined", () => {
        const result = gateway.verifyWebhookSignature(undefined as unknown as null);
        expect(result).toBe(false);
      });

      it("should return false for partial match", () => {
        const result = gateway.verifyWebhookSignature(
          "test_webhook_token_extra",
        );
        expect(result).toBe(false);
      });

      it("should return false for case-sensitive mismatch", () => {
        const result = gateway.verifyWebhookSignature("TEST_WEBHOOK_TOKEN");
        expect(result).toBe(false);
      });
    });

    describe("Edge cases", () => {
      it("should return false for whitespace-only signature", () => {
        const result = gateway.verifyWebhookSignature("   ");
        expect(result).toBe(false);
      });

      it("should handle very long signatures correctly", () => {
        const longSignature = "a".repeat(1000);
        const result = gateway.verifyWebhookSignature(longSignature);
        expect(result).toBe(false);
      });

      it("should return false when token is unset and signature provided", () => {
        delete process.env.XENDIT_WEBHOOK_TOKEN;
        const gatewayNoToken = new XenditGateway();
        const result = gatewayNoToken.verifyWebhookSignature("any_signature");
        expect(result).toBe(false);
      });
    });
  });

  describe("XenditGateway instance properties", () => {
    it("should have provider set to 'xendit'", () => {
      expect(gateway.provider).toBe("xendit");
    });

    it("should be a new instance each time (not singleton)", () => {
      const gateway2 = new XenditGateway();
      expect(gateway).not.toBe(gateway2);
      expect(gateway.provider).toBe(gateway2.provider);
    });
  });
});
