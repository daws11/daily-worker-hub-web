/**
 * scripts/setup-analytics-webhooks.ts
 *
 * Documentation/setup script for configuring analytics webhook integrations.
 * Run with: npx tsx scripts/setup-analytics-webhooks.ts
 *
 * This script is READ-ONLY — it does NOT make live HTTP calls.
 * It displays setup instructions and environment variable requirements.
 */

const vercelAnalyticsId = process.env.VERCEL_ANALYTICS_ID;
const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
const discordWebhookUrl = process.env.DISCORD_WEBHOOK_URL;

// --- Vercel Analytics ID ---

console.log("📊 Vercel Analytics — Setup Check\n");

if (vercelAnalyticsId) {
  console.log(`✅ VERCEL_ANALYTICS_ID is set: ${vercelAnalyticsId.substring(0, 8)}...`);
} else {
  console.log(`⚠️  VERCEL_ANALYTICS_ID is NOT set.`);
  console.log(`   On Vercel deployments this is auto-detected. For local development:`);
  console.log(`   1. Go to https://vercel.com/dashboard → your project → Settings → Analytics`);
  console.log(`   2. Copy the "Measurement ID" (e.g. V0xxxxxxxxxxxxxxxx)`);
  console.log(`   3. Add to your .env.local:`);
  console.log(`      VERCEL_ANALYTICS_ID=V0xxxxxxxxxxxxxxxx\n`);
}

// --- Slack Webhook ---

console.log("--- Slack Webhook Integration ---\n");

if (slackWebhookUrl) {
  console.log(`✅ SLACK_WEBHOOK_URL is set: ${slackWebhookUrl.substring(0, 20)}...`);
} else {
  console.log(`⚠️  SLACK_WEBHOOK_URL is NOT set.`);
  console.log(`   To obtain a Slack webhook URL:`);
  console.log(`   1. Go to https://api.slack.com/apps → Create New App → From scratch`);
  console.log(`   2. Name your app (e.g. "Daily Worker Hub Analytics") and pick a workspace`);
  console.log(`   3. Under "Features", click "Incoming Webhooks"`);
  console.log(`   4. Toggle "Activate Incoming Webhooks" to On`);
  console.log(`   5. Click "Add New Webhook to Workspace"`);
  console.log(`   6. Pick the channel where analytics alerts should post (e.g. #analytics-alerts)`);
  console.log(`   7. Copy the Webhook URL (starts with https://hooks.slack.com/services/)`);
  console.log(`   8. Add to your .env.local:`);
  console.log(`      SLACK_WEBHOOK_URL=https://hooks.slack.com/services/T.../B.../xxxxx\n`);
}

// --- Discord Webhook ---

console.log("--- Discord Webhook Integration ---\n");

if (discordWebhookUrl) {
  console.log(`✅ DISCORD_WEBHOOK_URL is set: ${discordWebhookUrl.substring(0, 20)}...`);
} else {
  console.log(`⚠️  DISCORD_WEBHOOK_URL is NOT set.`);
  console.log(`   To obtain a Discord webhook URL:`);
  console.log(`   1. Open Discord → Server Settings → Integrations → Webhooks`);
  console.log(`   2. Click "New Webhook" or "Create Webhook"`);
  console.log(`   3. Name your webhook (e.g. "Analytics Bot") and pick a channel`);
  console.log(`   4. Copy the webhook URL (starts with https://discord.com/api/webhooks/)`);
  console.log(`   5. Add to your .env.local:`);
  console.log(`      DISCORD_WEBHOOK_URL=https://discord.com/api/webhooks/.../...\n`);
}

// --- Client-side env vars ---

console.log("--- Client-Side (Public) Environment Variables ---\n");
console.log(`   For analytics webhooks to work from the browser (if needed), prefix with NEXT_PUBLIC_:`);
console.log(`   - NEXT_PUBLIC_VERCEL_ANALYTICS_ID  (auto-detected on Vercel; optional for local dev)`);
console.log(`   - NEXT_PUBLIC_SLACK_WEBHOOK_URL    (optional; only if exposing webhook to client)`);
console.log(`   - NEXT_PUBLIC_DISCORD_WEBHOOK_URL  (optional; only if exposing webhook to client)\n`);
console.log(`   ⚠️  Warning: Exposing webhook URLs client-side means they are visible in browser bundle.`);
console.log(`      Use server-side reporting (lib/analytics/reporting.ts) to keep webhooks secret.\n`);

// --- Summary ---

const allSet = vercelAnalyticsId && slackWebhookUrl && discordWebhookUrl;

console.log("========================================");
if (allSet) {
  console.log("✅ All analytics webhook environment variables are configured.");
} else {
  console.log("📋 Next Steps:");
  if (!vercelAnalyticsId) console.log("   1. Set VERCEL_ANALYTICS_ID");
  if (!slackWebhookUrl) console.log("   2. Set SLACK_WEBHOOK_URL (optional)");
  if (!discordWebhookUrl) console.log("   3. Set DISCORD_WEBHOOK_URL (optional)");
  console.log("\n   Add variables to .env.local and restart the dev server.");
  console.log("   See .env.local.example for all supported variables.");
}
console.log("========================================\n");

console.log("--- Integration Files Reference ---\n");
console.log(`   lib/analytics/reporting.ts     — Type-safe Slack/Discord webhook utilities`);
console.log(`   lib/analytics/events.ts         — Custom event tracking (Vercel Analytics)`);
console.log(`   lib/analytics/web-vitals.ts     — Core Web Vitals tracking`);
console.log(`   .env.local.example              — All supported environment variables\n`);

console.log("Done.\n");
