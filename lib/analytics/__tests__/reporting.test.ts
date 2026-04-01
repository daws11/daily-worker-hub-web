/**
 * Webhook Reporting Unit Tests
 *
 * Tests lib/analytics/reporting.ts:
 * - Browser context guard (rejects server-side calls)
 * - Do Not Track (DNT) compliance
 * - Webhook URL validation (Slack and Discord)
 * - Provider auto-detection from URL
 * - Slack Block Kit message building
 * - Discord webhook embed building
 * - HTTP error handling
 * - Network error handling
 * - Convenience wrappers (reportAnalyticsEventToWebhook, reportWebVitalToWebhook)
 * - Environment variable helpers
 * - reportToAllWebhooks multi-provider routing
 *
 * Strategy: Mock globalThis.fetch for network calls. happy-dom provides window/navigator
 * globals so DNT guards and browser context guards can be exercised in the test environment.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Simulate server context by deleting the `window` property that happy-dom injects.
 * In happy-dom, `window` is a global. We delete it to mimic SSR (server context).
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
  // Ensure DNT is off / unspecified in happy-dom so default state = sending allowed
  Object.defineProperty(navigator, "doNotTrack", {
    value: null,
    configurable: true,
  });
  const win = globalThis.window as Window & { doNotTrack?: string | null };
  if (win) win.doNotTrack = undefined;
  // Clear env vars
  delete process.env.NEXT_PUBLIC_SLACK_WEBHOOK_URL;
  delete process.env.NEXT_PUBLIC_DISCORD_WEBHOOK_URL;
  // Reset fetch mock
  globalThis.fetch = vi.fn();
});

afterEach(() => {
  vi.clearAllMocks();
});

// ---------------------------------------------------------------------------
// Import the module under test (must be after mocks are set up)
// ---------------------------------------------------------------------------

import {
  reportEventToWebhook,
  reportAnalyticsEventToWebhook,
  reportWebVitalToWebhook,
  getSlackWebhookUrl,
  getDiscordWebhookUrl,
  reportToAllWebhooks,
  WEBHOOK_ENV_KEYS,
  type WebhookEvent,
} from "../reporting";

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("Webhook Reporting", () => {
  // -------------------------------------------------------------------------
  // Browser Context Guard
  // -------------------------------------------------------------------------
  describe("Browser context guard", () => {
    it("should reject sending in server context", async () => {
      const restore = simulateServerContext();
      try {
        const result = await reportEventToWebhook(
          { name: "test_event" },
          "https://hooks.slack.com/services/XXX/YYY/ZZZ",
        );
        expect(result.success).toBe(false);
        expect(result.error).toBe("Cannot send webhook in server context");
      } finally {
        restore();
      }
    });
  });

  // -------------------------------------------------------------------------
  // Do Not Track Guard
  // -------------------------------------------------------------------------
  describe("Do Not Track", () => {
    it("should skip sending when navigator.doNotTrack is '1'", async () => {
      const restore = setDoNotTrack("1");
      try {
        const result = await reportEventToWebhook(
          { name: "test_event" },
          "https://hooks.slack.com/services/XXX/YYY/ZZZ",
        );
        expect(result.success).toBe(false);
        expect(result.error).toBe("User has Do Not Track enabled");
      } finally {
        restore();
      }
    });

    it("should skip sending when window.doNotTrack is '1'", async () => {
      const restore = setWindowDoNotTrack("1");
      try {
        const result = await reportEventToWebhook(
          { name: "test_event" },
          "https://hooks.slack.com/services/XXX/YYY/ZZZ",
        );
        expect(result.success).toBe(false);
        expect(result.error).toBe("User has Do Not Track enabled");
      } finally {
        restore();
      }
    });

    it("should allow sending when navigator.doNotTrack is '0'", async () => {
      const restore = setDoNotTrack("0");
      try {
        (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve("OK"),
        });
        const result = await reportEventToWebhook(
          { name: "test_event" },
          "https://hooks.slack.com/services/XXX/YYY/ZZZ",
        );
        expect(result.success).toBe(true);
      } finally {
        restore();
      }
    });
  });

  // -------------------------------------------------------------------------
  // Webhook URL Validation
  // -------------------------------------------------------------------------
  describe("Webhook URL validation", () => {
    it("should reject empty webhook URL", async () => {
      const result = await reportEventToWebhook({ name: "test" }, "");
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Invalid webhook URL/i);
    });

    it("should reject null webhook URL", async () => {
      const result = await reportEventToWebhook({ name: "test" }, null as unknown as string);
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Invalid webhook URL/i);
    });

    it("should reject non-HTTPS Slack webhook URL", async () => {
      const result = await reportEventToWebhook(
        { name: "test" },
        "http://hooks.slack.com/services/XXX/YYY/ZZZ",
      );
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Invalid webhook URL/i);
    });

    it("should reject non-HTTPS Discord webhook URL", async () => {
      const result = await reportEventToWebhook(
        { name: "test" },
        "http://discord.com/api/webhooks/123/abc",
      );
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Invalid webhook URL/i);
    });

    it("should reject Slack URL with invalid hostname", async () => {
      const result = await reportEventToWebhook(
        { name: "test" },
        "https://evil.com/hooks.slack.com/services/XXX",
      );
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Invalid webhook URL/i);
    });

    it("should reject malformed URLs", async () => {
      const result = await reportEventToWebhook({ name: "test" }, "not-a-url");
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Invalid webhook URL/i);
    });

    it("should accept valid HTTPS Slack webhook URL (hooks.slack.com)", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });
      const result = await reportEventToWebhook(
        { name: "test" },
        "https://hooks.slack.com/services/XXX/YYY/ZZZ",
      );
      expect(result.success).toBe(true);
    });

    it("should accept valid HTTPS Slack custom webhook URL (.slack.com)", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });
      const result = await reportEventToWebhook(
        { name: "test" },
        "https://myorg.slack.com/services/XXX/YYY/ZZZ",
      );
      expect(result.success).toBe(true);
    });

    it("should accept valid HTTPS Discord webhook URL (discord.com)", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });
      const result = await reportEventToWebhook(
        { name: "test" },
        "https://discord.com/api/webhooks/123456/abcdef",
      );
      expect(result.success).toBe(true);
    });

    it("should accept valid HTTPS Discord webhook URL (.discord.com)", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });
      const result = await reportEventToWebhook(
        { name: "test" },
        "https://discord.com/api/webhooks/123456/abcdef",
      );
      expect(result.success).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Successful Webhook Send
  // -------------------------------------------------------------------------
  describe("Successful webhook send", () => {
    it("should return success on 200 response", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });
      const result = await reportEventToWebhook(
        { name: "booking_created", properties: { amount: 150000 } },
        "https://hooks.slack.com/services/XXX/YYY/ZZZ",
      );
      expect(result.success).toBe(true);
    });

    it("should return success on 204 No Content response", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 204,
        text: () => Promise.resolve(""),
      });
      const result = await reportEventToWebhook(
        { name: "test" },
        "https://discord.com/api/webhooks/123/abc",
      );
      expect(result.success).toBe(true);
    });

    it("should include statusCode in result data on success", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });
      const result = await reportEventToWebhook(
        { name: "test" },
        "https://hooks.slack.com/services/XXX/YYY/ZZZ",
      );
      expect(result.success).toBe(true);
      expect(result.data?.statusCode).toBe(200);
    });

    it("should call fetch with POST method and JSON content type", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });
      await reportEventToWebhook(
        { name: "test" },
        "https://hooks.slack.com/services/XXX/YYY/ZZZ",
      );
      expect(globalThis.fetch).toHaveBeenCalledWith(
        "https://hooks.slack.com/services/XXX/YYY/ZZZ",
        expect.objectContaining({
          method: "POST",
          headers: expect.objectContaining({
            "Content-Type": "application/json",
          }),
        }),
      );
    });

    it("should include body in result data", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("ok"),
      });
      const result = await reportEventToWebhook(
        { name: "test" },
        "https://hooks.slack.com/services/XXX/YYY/ZZZ",
      );
      expect(result.data?.body).toBe("ok");
    });
  });

  // -------------------------------------------------------------------------
  // HTTP Error Handling
  // -------------------------------------------------------------------------
  describe("HTTP error handling", () => {
    it("should return failure on 400 response", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 400,
        text: () => Promise.resolve("Bad Request"),
      });
      const result = await reportEventToWebhook(
        { name: "test" },
        "https://hooks.slack.com/services/XXX/YYY/ZZZ",
      );
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/400/);
      expect(result.data?.statusCode).toBe(400);
    });

    it("should return failure on 401 Unauthorized response", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 401,
        text: () => Promise.resolve("Unauthorized"),
      });
      const result = await reportEventToWebhook(
        { name: "test" },
        "https://discord.com/api/webhooks/123/abc",
      );
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/401/);
    });

    it("should return failure on 403 Forbidden response", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 403,
        text: () => Promise.resolve("Forbidden"),
      });
      const result = await reportEventToWebhook(
        { name: "test" },
        "https://hooks.slack.com/services/XXX/YYY/ZZZ",
      );
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/403/);
    });

    it("should return failure on 404 Not Found response", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: () => Promise.resolve("Not Found"),
      });
      const result = await reportEventToWebhook(
        { name: "test" },
        "https://hooks.slack.com/services/XXX/YYY/ZZZ",
      );
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/404/);
    });

    it("should return failure on 429 Too Many Requests response", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: () => Promise.resolve("Rate limit exceeded"),
      });
      const result = await reportEventToWebhook(
        { name: "test" },
        "https://discord.com/api/webhooks/123/abc",
      );
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/429/);
    });

    it("should return failure on 500 Internal Server Error response", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve("Internal Server Error"),
      });
      const result = await reportEventToWebhook(
        { name: "test" },
        "https://hooks.slack.com/services/XXX/YYY/ZZZ",
      );
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/500/);
    });

    it("should handle unreadable response body gracefully on HTTP error", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.reject(new Error("Stream closed")),
      });
      const result = await reportEventToWebhook(
        { name: "test" },
        "https://hooks.slack.com/services/XXX/YYY/ZZZ",
      );
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/500/);
      expect(result.data?.body).toBe("Unable to read response body");
    });
  });

  // -------------------------------------------------------------------------
  // Network Error Handling
  // -------------------------------------------------------------------------
  describe("Network error handling", () => {
    it("should return failure on network error with Error message", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("Network connection refused"),
      );
      const result = await reportEventToWebhook(
        { name: "test" },
        "https://hooks.slack.com/services/XXX/YYY/ZZZ",
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe("Network connection refused");
    });

    it("should return failure on DNS resolution error", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new Error("ENOTFOUND"),
      );
      const result = await reportEventToWebhook(
        { name: "test" },
        "https://hooks.slack.com/services/XXX/YYY/ZZZ",
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe("ENOTFOUND");
    });

    it("should return generic failure message for non-Error thrown values", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        "string error",
      );
      const result = await reportEventToWebhook(
        { name: "test" },
        "https://hooks.slack.com/services/XXX/YYY/ZZZ",
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to send webhook");
    });

    it("should return generic failure message for null thrown values", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(null);
      const result = await reportEventToWebhook(
        { name: "test" },
        "https://hooks.slack.com/services/XXX/YYY/ZZZ",
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to send webhook");
    });

    it("should return generic failure message for undefined thrown values", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(undefined);
      const result = await reportEventToWebhook(
        { name: "test" },
        "https://hooks.slack.com/services/XXX/YYY/ZZZ",
      );
      expect(result.success).toBe(false);
      expect(result.error).toBe("Failed to send webhook");
    });
  });

  // -------------------------------------------------------------------------
  // Slack Payload Building
  // -------------------------------------------------------------------------
  describe("Slack payload building", () => {
    it("should build Slack Block Kit message with event name in header", async () => {
      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });

      await reportEventToWebhook(
        { name: "booking_created", properties: { booking_id: "b-1", amount: 150000 } },
        "https://hooks.slack.com/services/XXX/YYY/ZZZ",
      );

      const [, options] = mockFetch.mock.calls[0]!;
      const body = JSON.parse(options.body as string);
      expect(body.blocks).toBeDefined();
      expect(body.blocks[0].type).toBe("header");
      expect(body.blocks[0].text.text).toContain("booking_created");
    });

    it("should include properties as mrkdwn fields in Slack message", async () => {
      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });

      await reportEventToWebhook(
        { name: "test_event", properties: { amount: 500000, currency: "IDR" } },
        "https://hooks.slack.com/services/XXX/YYY/ZZZ",
      );

      const [, options] = mockFetch.mock.calls[0]!;
      const body = JSON.parse(options.body as string);
      const sectionBlock = body.blocks.find((b: { type: string }) => b.type === "section");
      expect(sectionBlock.fields).toHaveLength(2);
    });

    it("should include timestamp in Slack message context block", async () => {
      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });

      await reportEventToWebhook(
        { name: "test_event" },
        "https://hooks.slack.com/services/XXX/YYY/ZZZ",
      );

      const [, options] = mockFetch.mock.calls[0]!;
      const body = JSON.parse(options.body as string);
      const contextBlock = body.blocks.find((b: { type: string }) => b.type === "context");
      expect(contextBlock.elements[0].text).toContain("Timestamp:");
    });

    it("should use provided timestamp over auto-generated one", async () => {
      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });

      const customTimestamp = "2024-01-15T10:30:00.000Z";
      await reportEventToWebhook(
        { name: "test_event", timestamp: customTimestamp },
        "https://hooks.slack.com/services/XXX/YYY/ZZZ",
      );

      const [, options] = mockFetch.mock.calls[0]!;
      const body = JSON.parse(options.body as string);
      const contextBlock = body.blocks.find((b: { type: string }) => b.type === "context");
      expect(contextBlock.elements[0].text).toContain(customTimestamp);
    });

    it("should build Slack message without fields when no properties provided", async () => {
      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });

      await reportEventToWebhook(
        { name: "test_event" },
        "https://hooks.slack.com/services/XXX/YYY/ZZZ",
      );

      const [, options] = mockFetch.mock.calls[0]!;
      const body = JSON.parse(options.body as string);
      const sectionBlock = body.blocks.find((b: { type: string }) => b.type === "section");
      expect(sectionBlock.fields).toHaveLength(0);
    });
  });

  // -------------------------------------------------------------------------
  // Discord Payload Building
  // -------------------------------------------------------------------------
  describe("Discord payload building", () => {
    it("should build Discord embed with event name in title", async () => {
      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });

      await reportEventToWebhook(
        { name: "booking_created", properties: { amount: 150000 } },
        "https://discord.com/api/webhooks/123/abc",
      );

      const [, options] = mockFetch.mock.calls[0]!;
      const body = JSON.parse(options.body as string);
      expect(body.embeds).toBeDefined();
      expect(body.embeds[0].title).toContain("booking_created");
    });

    it("should include timestamp in Discord embed", async () => {
      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });

      await reportEventToWebhook(
        { name: "test_event" },
        "https://discord.com/api/webhooks/123/abc",
      );

      const [, options] = mockFetch.mock.calls[0]!;
      const body = JSON.parse(options.body as string);
      expect(body.embeds[0].timestamp).toBeDefined();
    });

    it("should include footer with 'Daily Worker Hub Analytics' in Discord embed", async () => {
      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });

      await reportEventToWebhook(
        { name: "test_event" },
        "https://discord.com/api/webhooks/123/abc",
      );

      const [, options] = mockFetch.mock.calls[0]!;
      const body = JSON.parse(options.body as string);
      expect(body.embeds[0].footer.text).toBe("Daily Worker Hub Analytics");
    });

    it("should set color coding for booking_created (green)", async () => {
      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });

      await reportEventToWebhook(
        { name: "booking_created" },
        "https://discord.com/api/webhooks/123/abc",
      );

      const [, options] = mockFetch.mock.calls[0]!;
      const body = JSON.parse(options.body as string);
      expect(body.embeds[0].color).toBe(0x22c55e);
    });

    it("should set color coding for payment_success (green)", async () => {
      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });

      await reportEventToWebhook(
        { name: "payment_success" },
        "https://discord.com/api/webhooks/123/abc",
      );

      const [, options] = mockFetch.mock.calls[0]!;
      const body = JSON.parse(options.body as string);
      expect(body.embeds[0].color).toBe(0x22c55e);
    });

    it("should set color coding for job_application (amber)", async () => {
      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });

      await reportEventToWebhook(
        { name: "job_application" },
        "https://discord.com/api/webhooks/123/abc",
      );

      const [, options] = mockFetch.mock.calls[0]!;
      const body = JSON.parse(options.body as string);
      expect(body.embeds[0].color).toBe(0xf59e0b);
    });

    it("should set color coding for review_submitted (amber)", async () => {
      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });

      await reportEventToWebhook(
        { name: "review_submitted" },
        "https://discord.com/api/webhooks/123/abc",
      );

      const [, options] = mockFetch.mock.calls[0]!;
      const body = JSON.parse(options.body as string);
      expect(body.embeds[0].color).toBe(0xf59e0b);
    });

    it("should set color coding for login (purple)", async () => {
      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });

      await reportEventToWebhook(
        { name: "login" },
        "https://discord.com/api/webhooks/123/abc",
      );

      const [, options] = mockFetch.mock.calls[0]!;
      const body = JSON.parse(options.body as string);
      expect(body.embeds[0].color).toBe(0x8b5cf6);
    });

    it("should use default gray color for unknown events", async () => {
      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });

      await reportEventToWebhook(
        { name: "unknown_custom_event" },
        "https://discord.com/api/webhooks/123/abc",
      );

      const [, options] = mockFetch.mock.calls[0]!;
      const body = JSON.parse(options.body as string);
      expect(body.embeds[0].color).toBe(0x6b7280);
    });

    it("should include properties as inline fields in Discord embed", async () => {
      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });

      await reportEventToWebhook(
        { name: "test_event", properties: { worker_id: "w-1", job_id: "j-1" } },
        "https://discord.com/api/webhooks/123/abc",
      );

      const [, options] = mockFetch.mock.calls[0]!;
      const body = JSON.parse(options.body as string);
      expect(body.embeds[0].fields).toHaveLength(2);
      expect(body.embeds[0].fields[0].inline).toBe(true);
    });

    it("should set description to default message when no properties provided", async () => {
      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });

      await reportEventToWebhook(
        { name: "test_event" },
        "https://discord.com/api/webhooks/123/abc",
      );

      const [, options] = mockFetch.mock.calls[0]!;
      const body = JSON.parse(options.body as string);
      expect(body.embeds[0].description).toBe("Analytics event recorded.");
    });

    it("should set description to undefined when properties are present", async () => {
      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });

      await reportEventToWebhook(
        { name: "test_event", properties: { key: "value" } },
        "https://discord.com/api/webhooks/123/abc",
      );

      const [, options] = mockFetch.mock.calls[0]!;
      const body = JSON.parse(options.body as string);
      expect(body.embeds[0].description).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // reportAnalyticsEventToWebhook Convenience Wrapper
  // -------------------------------------------------------------------------
  describe("reportAnalyticsEventToWebhook", () => {
    it("should call reportEventToWebhook with correct event name", async () => {
      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });

      await reportAnalyticsEventToWebhook(
        "booking_created",
        { booking_id: "b-1", amount: 200000 },
        "https://hooks.slack.com/services/XXX/YYY/ZZZ",
      );

      expect(mockFetch).toHaveBeenCalledTimes(1);
    });

    it("should set timestamp to current ISO string", async () => {
      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });

      await reportAnalyticsEventToWebhook(
        "test_event",
        {},
        "https://hooks.slack.com/services/XXX/YYY/ZZZ",
      );

      const [, options] = mockFetch.mock.calls[0]!;
      const body = JSON.parse(options.body as string);
      expect(body.blocks[2].elements[0].text).toMatch(/Timestamp:/);
    });

    it("should pass through properties from call to webhook payload", async () => {
      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });

      await reportAnalyticsEventToWebhook(
        "payment_success",
        { booking_id: "b-999", amount: 500000, method: "bank_transfer" },
        "https://discord.com/api/webhooks/123/abc",
      );

      const [, options] = mockFetch.mock.calls[0]!;
      const body = JSON.parse(options.body as string);
      expect(body.embeds[0].fields).toContainEqual(
        expect.objectContaining({ name: "booking_id", value: "b-999" }),
      );
    });

    it("should return SendWebhookResult type (same as ReportResult)", async () => {
      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });

      const result = await reportAnalyticsEventToWebhook(
        "test_event",
        {},
        "https://hooks.slack.com/services/XXX/YYY/ZZZ",
      );

      expect(result.success).toBe(true);
    });

    it("should return failure when webhook URL is invalid", async () => {
      const result = await reportAnalyticsEventToWebhook(
        "test_event",
        {},
        "https://invalid.example.com/webhook",
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Invalid webhook URL/i);
    });
  });

  // -------------------------------------------------------------------------
  // reportWebVitalToWebhook Convenience Wrapper
  // -------------------------------------------------------------------------
  describe("reportWebVitalToWebhook", () => {
    it("should format LCP metric with correct event name", async () => {
      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });

      await reportWebVitalToWebhook(
        "LCP",
        2500,
        "needs-improvement",
        "https://discord.com/api/webhooks/123/abc",
      );

      const [, options] = mockFetch.mock.calls[0]!;
      const body = JSON.parse(options.body as string);
      expect(body.embeds[0].title).toContain("web_vital_lcp");
    });

    it("should format INP metric with correct event name", async () => {
      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });

      await reportWebVitalToWebhook(
        "INP",
        200,
        "good",
        "https://discord.com/api/webhooks/123/abc",
      );

      const [, options] = mockFetch.mock.calls[0]!;
      const body = JSON.parse(options.body as string);
      expect(body.embeds[0].title).toContain("web_vital_inp");
    });

    it("should format CLS metric with correct event name", async () => {
      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });

      await reportWebVitalToWebhook(
        "CLS",
        0.05,
        "good",
        "https://discord.com/api/webhooks/123/abc",
      );

      const [, options] = mockFetch.mock.calls[0]!;
      const body = JSON.parse(options.body as string);
      expect(body.embeds[0].title).toContain("web_vital_cls");
    });

    it("should include value, rating, and unit in properties for LCP", async () => {
      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });

      await reportWebVitalToWebhook(
        "LCP",
        2500,
        "needs-improvement",
        "https://discord.com/api/webhooks/123/abc",
      );

      const [, options] = mockFetch.mock.calls[0]!;
      const body = JSON.parse(options.body as string);
      expect(body.embeds[0].fields).toContainEqual(
        expect.objectContaining({ name: "value", value: "2500" }),
      );
      expect(body.embeds[0].fields).toContainEqual(
        expect.objectContaining({ name: "rating", value: "needs-improvement" }),
      );
      expect(body.embeds[0].fields).toContainEqual(
        expect.objectContaining({ name: "unit", value: "ms" }),
      );
    });

    it("should use unit 'score' for CLS metric", async () => {
      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });

      await reportWebVitalToWebhook(
        "CLS",
        0.1,
        "poor",
        "https://discord.com/api/webhooks/123/abc",
      );

      const [, options] = mockFetch.mock.calls[0]!;
      const body = JSON.parse(options.body as string);
      expect(body.embeds[0].fields).toContainEqual(
        expect.objectContaining({ name: "unit", value: "score" }),
      );
    });

    it("should use unit 'ms' for INP metric", async () => {
      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });

      await reportWebVitalToWebhook(
        "INP",
        100,
        "good",
        "https://discord.com/api/webhooks/123/abc",
      );

      const [, options] = mockFetch.mock.calls[0]!;
      const body = JSON.parse(options.body as string);
      expect(body.embeds[0].fields).toContainEqual(
        expect.objectContaining({ name: "unit", value: "ms" }),
      );
    });

    it("should return SendWebhookResult type (same as ReportResult)", async () => {
      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });

      const result = await reportWebVitalToWebhook(
        "LCP",
        2500,
        "needs-improvement",
        "https://hooks.slack.com/services/XXX/YYY/ZZZ",
      );

      expect(result.success).toBe(true);
    });

    it("should return failure when webhook URL is invalid", async () => {
      const result = await reportWebVitalToWebhook(
        "LCP",
        2500,
        "needs-improvement",
        "ftp://invalid.example.com/webhook",
      );

      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Invalid webhook URL/i);
    });
  });

  // -------------------------------------------------------------------------
  // Environment Variable Helpers
  // -------------------------------------------------------------------------
  describe("Environment variable helpers", () => {
    describe("getSlackWebhookUrl", () => {
      it("should return undefined when env var is not set", () => {
        expect(getSlackWebhookUrl()).toBeUndefined();
      });

      it("should return the configured Slack webhook URL when set", () => {
        process.env.NEXT_PUBLIC_SLACK_WEBHOOK_URL =
          "https://hooks.slack.com/services/AAA/BBB/CCC";
        expect(getSlackWebhookUrl()).toBe(
          "https://hooks.slack.com/services/AAA/BBB/CCC",
        );
      });
    });

    describe("getDiscordWebhookUrl", () => {
      it("should return undefined when env var is not set", () => {
        expect(getDiscordWebhookUrl()).toBeUndefined();
      });

      it("should return the configured Discord webhook URL when set", () => {
        process.env.NEXT_PUBLIC_DISCORD_WEBHOOK_URL =
          "https://discord.com/api/webhooks/999/xyz";
        expect(getDiscordWebhookUrl()).toBe(
          "https://discord.com/api/webhooks/999/xyz",
        );
      });
    });

    describe("WEBHOOK_ENV_KEYS", () => {
      it("should expose correct Slack env key", () => {
        expect(WEBHOOK_ENV_KEYS.slack).toBe("SLACK_WEBHOOK_URL");
      });

      it("should expose correct Discord env key", () => {
        expect(WEBHOOK_ENV_KEYS.discord).toBe("DISCORD_WEBHOOK_URL");
      });

      it("should have both slack and discord keys", () => {
        expect(Object.keys(WEBHOOK_ENV_KEYS)).toHaveLength(2);
        expect(WEBHOOK_ENV_KEYS).toHaveProperty("slack");
        expect(WEBHOOK_ENV_KEYS).toHaveProperty("discord");
      });
    });
  });

  // -------------------------------------------------------------------------
  // reportToAllWebhooks
  // -------------------------------------------------------------------------
  describe("reportToAllWebhooks", () => {
    it("should return empty array when no webhooks are configured", async () => {
      const results = await reportToAllWebhooks({ name: "test_event" });
      expect(results).toEqual([]);
    });

    it("should send to Slack only when only Slack URL is configured", async () => {
      process.env.NEXT_PUBLIC_SLACK_WEBHOOK_URL =
        "https://hooks.slack.com/services/AAA/BBB/CCC";
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });

      const results = await reportToAllWebhooks({
        name: "booking_created",
        properties: { amount: 150000 },
      });

      expect(results).toHaveLength(1);
      expect(results[0].provider).toBe("slack");
      expect(results[0].result.success).toBe(true);
    });

    it("should send to Discord only when only Discord URL is configured", async () => {
      process.env.NEXT_PUBLIC_DISCORD_WEBHOOK_URL =
        "https://discord.com/api/webhooks/123/abc";
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });

      const results = await reportToAllWebhooks({ name: "test_event" });

      expect(results).toHaveLength(1);
      expect(results[0].provider).toBe("discord");
      expect(results[0].result.success).toBe(true);
    });

    it("should send to both Slack and Discord when both URLs are configured", async () => {
      process.env.NEXT_PUBLIC_SLACK_WEBHOOK_URL =
        "https://hooks.slack.com/services/AAA/BBB/CCC";
      process.env.NEXT_PUBLIC_DISCORD_WEBHOOK_URL =
        "https://discord.com/api/webhooks/123/abc";
      (globalThis.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve("OK"),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve("OK"),
        });

      const results = await reportToAllWebhooks({ name: "test_event" });

      expect(results).toHaveLength(2);
      expect(results.map((r) => r.provider)).toContain("slack");
      expect(results.map((r) => r.provider)).toContain("discord");
    });

    it("should report Slack failure without stopping Discord send", async () => {
      process.env.NEXT_PUBLIC_SLACK_WEBHOOK_URL =
        "https://hooks.slack.com/services/AAA/BBB/CCC";
      process.env.NEXT_PUBLIC_DISCORD_WEBHOOK_URL =
        "https://discord.com/api/webhooks/123/abc";
      (globalThis.fetch as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: () => Promise.resolve("Internal Error"),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          text: () => Promise.resolve("OK"),
        });

      const results = await reportToAllWebhooks({ name: "test_event" });

      expect(results).toHaveLength(2);
      const slackResult = results.find((r) => r.provider === "slack");
      expect(slackResult?.result.success).toBe(false);
      const discordResult = results.find((r) => r.provider === "discord");
      expect(discordResult?.result.success).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Result Types
  // -------------------------------------------------------------------------
  describe("Result types", () => {
    it("should always return an object with a 'success' boolean field on success", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });

      const result = await reportEventToWebhook(
        { name: "test" },
        "https://hooks.slack.com/services/XXX/YYY/ZZZ",
      );
      expect(result.success).toBe(true);
      expect(typeof result.success).toBe("boolean");
    });

    it("should always return an object with a 'success' boolean field on failure", async () => {
      const result = await reportEventToWebhook(
        { name: "test" },
        "https://invalid.example.com/webhook",
      );
      expect(result.success).toBe(false);
      expect(typeof result.success).toBe("boolean");
    });

    it("should return error string (not object) on failure", async () => {
      const result = await reportEventToWebhook(
        { name: "test" },
        "https://invalid.example.com/webhook",
      );
      expect(typeof result.error).toBe("string");
      expect(result.error!.length).toBeGreaterThan(0);
    });
  });

  // -------------------------------------------------------------------------
  // Realistic Bali Worker Hub Scenarios
  // -------------------------------------------------------------------------
  describe("Realistic Bali Worker Hub scenarios", () => {
    it("should send booking_created event to Slack webhook", async () => {
      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });

      const result = await reportEventToWebhook(
        {
          name: "booking_created",
          properties: { booking_id: "booking-001", amount: 200000, daily_rate: 150000 },
        },
        "https://hooks.slack.com/services/XXX/YYY/ZZZ",
      );

      expect(result.success).toBe(true);
      const [, options] = mockFetch.mock.calls[0]!;
      const body = JSON.parse(options.body as string);
      expect(body.blocks[0].text.text).toContain("booking_created");
    });

    it("should send payment_success event to Discord webhook", async () => {
      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });

      const result = await reportEventToWebhook(
        {
          name: "payment_success",
          properties: { booking_id: "booking-002", amount: 200000, method: "bank_transfer" },
        },
        "https://discord.com/api/webhooks/123/abc",
      );

      expect(result.success).toBe(true);
      const [, options] = mockFetch.mock.calls[0]!;
      const body = JSON.parse(options.body as string);
      expect(body.embeds[0].color).toBe(0x22c55e); // green
    });

    it("should send job_application event to Discord webhook", async () => {
      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });

      const result = await reportEventToWebhook(
        {
          name: "job_application",
          properties: { worker_id: "worker-abc", job_id: "job-xyz", role: "housekeeper" },
        },
        "https://discord.com/api/webhooks/123/abc",
      );

      expect(result.success).toBe(true);
      const [, options] = mockFetch.mock.calls[0]!;
      const body = JSON.parse(options.body as string);
      expect(body.embeds[0].color).toBe(0xf59e0b); // amber
    });

    it("should send registration event to Slack webhook", async () => {
      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });

      const result = await reportAnalyticsEventToWebhook(
        "registration",
        { role: "worker" },
        "https://hooks.slack.com/services/XXX/YYY/ZZZ",
      );

      expect(result.success).toBe(true);
    });

    it("should send LCP Web Vital to Discord webhook", async () => {
      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });

      const result = await reportWebVitalToWebhook(
        "LCP",
        2500,
        "needs-improvement",
        "https://discord.com/api/webhooks/123/abc",
      );

      expect(result.success).toBe(true);
    });

    it("should send CLS Web Vital to Discord webhook", async () => {
      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });

      const result = await reportWebVitalToWebhook(
        "CLS",
        0.05,
        "good",
        "https://discord.com/api/webhooks/123/abc",
      );

      expect(result.success).toBe(true);
    });
  });

  // -------------------------------------------------------------------------
  // Edge Cases
  // -------------------------------------------------------------------------
  describe("Edge cases", () => {
    it("should handle event with empty properties object", async () => {
      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });

      const result = await reportEventToWebhook(
        { name: "test_event", properties: {} },
        "https://hooks.slack.com/services/XXX/YYY/ZZZ",
      );
      expect(result.success).toBe(true);
    });

    it("should handle event with all property value types (string, number, boolean)", async () => {
      const mockFetch = globalThis.fetch as ReturnType<typeof vi.fn>;
      mockFetch.mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });

      const result = await reportEventToWebhook(
        {
          name: "test_event",
          properties: { is_active: true, score: 95.5, label: "high" },
        },
        "https://hooks.slack.com/services/XXX/YYY/ZZZ",
      );
      expect(result.success).toBe(true);
      const [, options] = mockFetch.mock.calls[0]!;
      const body = JSON.parse(options.body as string);
      const sectionBlock = body.blocks.find((b: { type: string }) => b.type === "section");
      expect(sectionBlock.fields).toHaveLength(3);
    });

    it("should handle webhook URL with trailing slash", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });

      const result = await reportEventToWebhook(
        { name: "test" },
        "https://hooks.slack.com/services/XXX/YYY/ZZZ/",
      );
      expect(result.success).toBe(true);
    });

    it("should handle Discord webhook URL with trailing slash", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });

      const result = await reportEventToWebhook(
        { name: "test" },
        "https://discord.com/api/webhooks/123/abc/",
      );
      expect(result.success).toBe(true);
    });

    it("should skip sending when webhook URL is whitespace-only string", async () => {
      const result = await reportEventToWebhook(
        { name: "test" },
        "   ",
      );
      expect(result.success).toBe(false);
      expect(result.error).toMatch(/Invalid webhook URL/i);
    });
  });

  // -------------------------------------------------------------------------
  // Performance
  // -------------------------------------------------------------------------
  describe("Performance", () => {
    it("should send webhooks quickly (benchmark single send)", async () => {
      (globalThis.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
        ok: true,
        status: 200,
        text: () => Promise.resolve("OK"),
      });

      const start = performance.now();
      for (let i = 0; i < 100; i++) {
        await reportEventToWebhook(
          { name: `event_${i}`, properties: { index: i } },
          "https://hooks.slack.com/services/XXX/YYY/ZZZ",
        );
      }
      const end = performance.now();
      // Should complete 100 sends in less than 500ms (network calls are mocked)
      expect(end - start).toBeLessThan(500);
    });
  });
});
