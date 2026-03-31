/**
 * Webhook utilities for sending analytics events to external reporting tools
 * (Slack, Discord, etc.).
 *
 * This is a placeholder module — webhook URLs are not wired to live endpoints
 * pending confirmation of which tool to integrate.
 *
 * All functions are client-side only and respect the user's Do Not Track preference.
 *
 * @see https://vercel.com/docs/concepts/analytics
 */

// ---------------------------------------------------------------------------
// Result Types
// ---------------------------------------------------------------------------

export type ReportResult = {
  success: boolean;
  error?: string;
  data?: {
    statusCode?: number;
    body?: string;
  };
};

export type SendWebhookResult = ReportResult;

// ---------------------------------------------------------------------------
// Payload Types
// ---------------------------------------------------------------------------

/** Supported webhook providers */
export type WebhookProvider = "slack" | "discord";

/** A single analytics event to send via webhook */
export type WebhookEvent = {
  name: string;
  properties?: Record<string, string | number | boolean>;
  timestamp?: string;
};

/** Slack-compatible webhook message block */
export type SlackBlock =
  | {
      type: "header";
      text: {
        type: "plain_text";
        text: string;
        emoji?: boolean;
      };
    }
  | {
      type: "section";
      text?: {
        type: "mrkdwn";
        text: string;
      };
      fields?: Array<{
        type: "mrkdwn";
        text: string;
      }>;
    }
  | {
      type: "context";
      elements: Array<{
        type: "mrkdwn";
        text: string;
      }>;
    };

/** Discord-compatible webhook embed */
export type DiscordEmbed = {
  title?: string;
  description?: string;
  color?: number;
  fields?: Array<{
    name: string;
    value: string;
    inline?: boolean;
  }>;
  timestamp?: string;
  footer?: {
    text: string;
  };
};

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Guard: only send webhooks in browser context.
 * Returns false and sets an error message if sending should be skipped.
 */
function canSend(): { allowed: boolean; error?: string } {
  if (typeof window === "undefined") {
    return { allowed: false, error: "Cannot send webhook in server context" };
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
 * Validate a webhook URL.
 * Accepts both Slack and Discord webhook URL patterns.
 */
function isValidWebhookUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      (parsed.hostname === "hooks.slack.com" ||
        parsed.hostname.endsWith(".slack.com") ||
        parsed.hostname.endsWith(".discord.com") ||
        parsed.hostname === "discord.com") &&
      parsed.protocol === "https:"
    );
  } catch {
    return false;
  }
}

/**
 * Detect the webhook provider from the URL hostname.
 */
function detectProvider(url: string): WebhookProvider {
  if (url.includes("slack.com")) return "slack";
  return "discord";
}

// ---------------------------------------------------------------------------
// Payload builders
// ---------------------------------------------------------------------------

/**
 * Build a Slack Block Kit message from a webhook event.
 * Creates a structured block with event name and properties.
 */
function buildSlackMessage(event: WebhookEvent): { blocks: SlackBlock[] } {
  const timestamp = event.timestamp ?? new Date().toISOString();

  const fields = event.properties
    ? Object.entries(event.properties).map(([key, value]) => ({
        type: "mrkdwn" as const,
        text: `*${key}:*\n${String(value)}`,
      }))
    : [];

  return {
    blocks: [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: `📊 Analytics Event: ${event.name}`,
          emoji: true,
        },
      },
      {
        type: "section",
        fields,
      },
      {
        type: "context",
        elements: [
          {
            type: "mrkdwn",
            text: `⏱ Timestamp: ${timestamp}`,
          },
        ],
      },
    ],
  };
}

/**
 * Build a Discord embed from a webhook event.
 * Creates a structured embed with event details and color coding.
 */
function buildDiscordEmbed(event: WebhookEvent): { embeds: DiscordEmbed[] } {
  const timestamp = event.timestamp ?? new Date().toISOString();

  const fields = event.properties
    ? Object.entries(event.properties).map(([key, value]) => ({
        name: key,
        value: String(value),
        inline: true,
      }))
    : [];

  // Color coding: green (0x22c55e) for good events, blue (0x3b82f6) default
  const colorMap: Record<string, number> = {
    registration: 0x3b82f6,
    login: 0x8b5cf6,
    booking_created: 0x22c55e,
    payment_success: 0x22c55e,
    job_application: 0xf59e0b,
    review_submitted: 0xf59e0b,
  };

  const color = colorMap[event.name] ?? 0x6b7280;

  return {
    embeds: [
      {
        title: `📊 ${event.name}`,
        description: fields.length > 0 ? undefined : "Analytics event recorded.",
        color,
        fields,
        timestamp,
        footer: {
          text: "Daily Worker Hub Analytics",
        },
      },
    ],
  };
}

// ---------------------------------------------------------------------------
// Core webhook function
// ---------------------------------------------------------------------------

/**
 * Send a single analytics event to a webhook endpoint.
 *
 * Supports Slack (Block Kit) and Discord (Webhook embeds) formats.
 * The provider is auto-detected from the URL hostname.
 *
 * @param event   - The analytics event to send.
 * @param webhookUrl - The full HTTPS webhook URL (Slack or Discord).
 * @returns ReportResult indicating success or failure.
 *
 * @example
 * const result = await reportEventToWebhook(
 *   { name: "booking_created", properties: { booking_id: "123", amount: 500 } },
 *   "https://hooks.slack.com/services/XXX/YYY/ZZZ"
 * );
 */
export async function reportEventToWebhook(
  event: WebhookEvent,
  webhookUrl: string,
): Promise<ReportResult> {
  const { allowed, error } = canSend();
  if (!allowed) return { success: false, error };

  if (!webhookUrl || !isValidWebhookUrl(webhookUrl)) {
    return {
      success: false,
      error: "Invalid webhook URL. Must be a valid HTTPS Slack or Discord webhook URL.",
    };
  }

  try {
    const provider = detectProvider(webhookUrl);
    const payload =
      provider === "slack" ? buildSlackMessage(event) : buildDiscordEmbed(event);

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const body = await response.text().catch(() => "Unable to read response body");
      return {
        success: false,
        error: `Webhook request failed with status ${response.status}`,
        data: { statusCode: response.status, body },
      };
    }

    const body = await response.text().catch(() => undefined);

    return {
      success: true,
      data: { statusCode: response.status, body },
    };
  } catch (err) {
    return {
      success: false,
      error:
        err instanceof Error
          ? err.message
          : "Failed to send webhook",
    };
  }
}

// ---------------------------------------------------------------------------
// Convenience helpers
// ---------------------------------------------------------------------------

/**
 * Report a Vercel Analytics event to a webhook endpoint.
 *
 * This is a thin wrapper around `reportEventToWebhook` that extracts
 * the event name and properties from a raw Vercel Analytics event object.
 *
 * @param name       - The event name (e.g. "booking_created").
 * @param properties - The event properties.
 * @param webhookUrl - The full HTTPS webhook URL.
 */
export async function reportAnalyticsEventToWebhook(
  name: string,
  properties: Record<string, string | number | boolean>,
  webhookUrl: string,
): Promise<SendWebhookResult> {
  return reportEventToWebhook(
    {
      name,
      properties,
      timestamp: new Date().toISOString(),
    },
    webhookUrl,
  );
}

/**
 * Report a Core Web Vitals metric to a webhook endpoint.
 *
 * @param metric - The metric name (LCP, INP, CLS).
 * @param value  - The metric value.
 * @param rating - The performance rating (good, needs-improvement, poor).
 * @param webhookUrl - The full HTTPS webhook URL.
 */
export async function reportWebVitalToWebhook(
  metric: "LCP" | "INP" | "CLS",
  value: number,
  rating: "good" | "needs-improvement" | "poor",
  webhookUrl: string,
): Promise<SendWebhookResult> {
  return reportEventToWebhook(
    {
      name: `web_vital_${metric.toLowerCase()}`,
      properties: {
        value,
        rating,
        unit: metric === "CLS" ? "score" : "ms",
      },
      timestamp: new Date().toISOString(),
    },
    webhookUrl,
  );
}

// ---------------------------------------------------------------------------
// Environment variable helpers
// ---------------------------------------------------------------------------

/** Environment variable keys for webhook URLs */
export const WEBHOOK_ENV_KEYS = {
  slack: "SLACK_WEBHOOK_URL",
  discord: "DISCORD_WEBHOOK_URL",
} as const;

/**
 * Get the configured Slack webhook URL from environment variables.
 * Returns undefined if not set.
 */
export function getSlackWebhookUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_SLACK_WEBHOOK_URL;
}

/**
 * Get the configured Discord webhook URL from environment variables.
 * Returns undefined if not set.
 */
export function getDiscordWebhookUrl(): string | undefined {
  return process.env.NEXT_PUBLIC_DISCORD_WEBHOOK_URL;
}

/**
 * Send an analytics event to all configured webhook providers.
 *
 * @param event - The analytics event to send.
 * @returns Array of results, one per configured provider.
 */
export async function reportToAllWebhooks(
  event: WebhookEvent,
): Promise<Array<{ provider: WebhookProvider; result: ReportResult }>> {
  const results: Array<{ provider: WebhookProvider; result: ReportResult }> = [];

  const slackUrl = getSlackWebhookUrl();
  if (slackUrl) {
    const result = await reportEventToWebhook(event, slackUrl);
    results.push({ provider: "slack", result });
  }

  const discordUrl = getDiscordWebhookUrl();
  if (discordUrl) {
    const result = await reportEventToWebhook(event, discordUrl);
    results.push({ provider: "discord", result });
  }

  return results;
}
