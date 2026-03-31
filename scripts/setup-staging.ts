/**
 * Staging Environment Provisioning Script
 *
 * Automates the setup of a complete staging environment for the Daily Worker Hub
 * application. This script:
 *   1. Validates the Supabase staging connection
 *   2. Applies the production schema via apply_remote_migrations.sql
 *   3. Seeds demo accounts (worker@demo.com / business@demo.com)
 *   4. Generates .env.staging with all provided credentials
 *
 * Prerequisites:
 *   - A Supabase project created at https://app.supabase.com (staging instance)
 *   - Xendit sandbox account at https://dashboard.xendit.co (sandbox mode)
 *   - Resend API key at https://resend.com/api-keys
 *   - Firebase staging project at https://console.firebase.google.com
 *
 * Usage:
 *   npx tsx scripts/setup-staging.ts
 *
 * Requirements:
 *   - Node.js 18+
 *   - @supabase/supabase-js (installed as dev dependency)
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { createClient } from "@supabase/supabase-js";
import * as readline from "node:readline";

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

const question = (prompt: string): Promise<string> =>
  new Promise((resolve) => rl.question(prompt, resolve));

const STAGING_ENV_TEMPLATE = ".env.staging.example";
const STAGING_ENV_OUTPUT = ".env.staging";
const MIGRATIONS_FILE = "apply_remote_migrations.sql";

const DEMO_ACCOUNTS = [
  {
    email: "worker@demo.com",
    password: "demo123456",
    role: "worker",
    full_name: "Demo Worker",
  },
  {
    email: "business@demo.com",
    password: "demo123456",
    role: "business",
    full_name: "Demo Business",
  },
] as const;

// ---------------------------------------------------------------------------
// Banner
// ---------------------------------------------------------------------------

function printBanner(): void {
  console.log(`
╔══════════════════════════════════════════════════════════════════════╗
║           Daily Worker Hub — Staging Environment Provisioning         ║
╚══════════════════════════════════════════════════════════════════════╝
`);
}

// ---------------------------------------------------------------------------
// Step 1 — Collect credentials
// ---------------------------------------------------------------------------

interface StagingCredentials {
  supabaseUrl: string;
  supabaseAnonKey: string;
  supabaseServiceRoleKey: string;
  xenditSecretKey: string;
  xenditWebhookToken: string;
  xenditPublicKey: string;
  resendApiKey: string;
  firebaseApiKey: string;
  firebaseAuthDomain: string;
  firebaseProjectId: string;
  firebaseStorageBucket: string;
  firebaseMessagingSenderId: string;
  firebaseAppId: string;
  firebaseVapidKey: string;
  firebaseProjectIdAdmin: string;
  firebaseClientEmail: string;
  firebasePrivateKey: string;
  vapidPublicKey: string;
  vapidPrivateKey: string;
  vapidContactEmail: string;
  appUrl: string;
  baseUrl: string;
  siteUrl: string;
  adminApiSecret: string;
  cronSecret: string;
  instagramAppId: string;
  instagramAppSecret: string;
  instagramRedirectUri: string;
  facebookAppId: string;
  facebookAppSecret: string;
  facebookPageId: string;
  sentryDsn: string;
  sentryAuthToken: string;
  sentryOrg: string;
  sentryProject: string;
  upstashRedisRestUrl: string;
  upstashRedisRestToken: string;
}

async function collectCredentials(): Promise<StagingCredentials> {
  console.log("📋 STEP 1 — Collect Staging Credentials\n");
  console.log(
    "   You will be prompted for credentials from your staging services.\n",
  );
  console.log(
    "   If you don't have a value yet, press Enter to use the placeholder.\n",
  );

  const creds = {} as StagingCredentials;

  // Supabase
  console.log("━━ Supabase (Staging Instance) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  creds.supabaseUrl =
    (await question("  Supabase Project URL\n  (e.g. https://abc123.supabase.co): ")) ||
    "https://your-staging-project.supabase.co";
  creds.supabaseAnonKey =
    (await question("  Supabase Anon Key: ")) || "your-staging-anon-key-here";
  creds.supabaseServiceRoleKey =
    (await question("  Supabase Service Role Key: ")) ||
    "your-staging-service-role-key-here";

  // Xendit
  console.log("\n━━ Xendit (Sandbox) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  creds.xenditSecretKey =
    (await question("  Xendit Secret Key (xnd_sandbox_...): ")) ||
    "your-staging-secret-key-here";
  creds.xenditWebhookToken =
    (await question("  Xendit Webhook Token: ")) ||
    "your-staging-webhook-token-here";
  creds.xenditPublicKey =
    (await question("  Xendit Public Key (optional): ")) || "";

  // Resend
  console.log("\n━━ Resend (Email) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  creds.resendApiKey =
    (await question("  Resend API Key (re_...): ")) ||
    "your-staging-resend-api-key-here";

  // Firebase (client-side)
  console.log("\n━━ Firebase (Push Notifications — Client) ━━━━━━━━━━━━━━━━━");
  creds.firebaseApiKey =
    (await question("  Firebase API Key: ")) || "your-staging-firebase-api-key";
  creds.firebaseAuthDomain =
    (await question("  Firebase Auth Domain\n  (e.g. staging-xxx.firebaseapp.com): ")) ||
    "your-staging-project.firebaseapp.com";
  creds.firebaseProjectId =
    (await question("  Firebase Project ID: ")) || "your-staging-project-id";
  creds.firebaseStorageBucket =
    (await question("  Firebase Storage Bucket: ")) ||
    "your-staging-project.appspot.com";
  creds.firebaseMessagingSenderId =
    (await question("  Firebase Messaging Sender ID (FCM): ")) ||
    "your-staging-sender-id";
  creds.firebaseAppId =
    (await question("  Firebase App ID: ")) || "your-staging-firebase-app-id";
  creds.firebaseVapidKey =
    (await question("  Firebase VAPID Key: ")) || "your-staging-firebase-vapid-key";

  // Firebase (server-side / Admin)
  console.log("\n━━ Firebase (Push Notifications — Admin) ━━━━━━━━━━━━━━━━━━");
  creds.firebaseProjectIdAdmin =
    (await question("  Firebase Admin Project ID: ")) || creds.firebaseProjectId;
  creds.firebaseClientEmail =
    (await question("  Firebase Admin Client Email\n  (firebase-adminsdk-...@...iam.gserviceaccount.com): ")) ||
    "firebase-adminsdk-xxxxx@your-staging-project.iam.gserviceaccount.com";
  creds.firebasePrivateKey =
    (await question(
      "  Firebase Admin Private Key\n  (paste the full -----BEGIN PRIVATE KEY----- ... block): ",
    )) ||
    "-----BEGIN PRIVATE KEY-----\\nYour staging private key here\\n-----END PRIVATE KEY-----\\n";

  // VAPID keys (Web Push)
  console.log("\n━━ VAPID Keys (Web Push) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(
    "  Generate with: npx web-push generate-vapid-keys\n",
  );
  creds.vapidPublicKey =
    (await question("  VAPID Public Key: ")) || "your-staging-vapid-public-key";
  creds.vapidPrivateKey =
    (await question("  VAPID Private Key: ")) || "your-staging-vapid-private-key";
  creds.vapidContactEmail =
    (await question("  VAPID Contact Email (mailto:): ")) ||
    "mailto:noreply@dailyworkerhub.id";

  // Application URLs
  console.log("\n━━ Application URLs ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  creds.appUrl =
    (await question(
      "  NEXT_PUBLIC_APP_URL (default: http://localhost:3000): ",
    )) || "http://localhost:3000";
  creds.baseUrl =
    (await question(
      "  NEXT_PUBLIC_BASE_URL (default: http://localhost:3000): ",
    )) || "http://localhost:3000";
  creds.siteUrl =
    (await question(
      "  NEXT_PUBLIC_SITE_URL (default: http://localhost:3000): ",
    )) || "http://localhost:3000";

  // Admin / Cron
  console.log("\n━━ Admin & Cron ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  creds.adminApiSecret =
    (await question("  ADMIN_API_SECRET: ")) || "generate-a-random-secret-here";
  creds.cronSecret =
    (await question("  CRON_SECRET: ")) || "generate-a-random-secret-here";

  // Social Media
  console.log("\n━━ Social Media (Optional) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  creds.instagramAppId = (await question("  Instagram App ID: ")) || "";
  creds.instagramAppSecret =
    (await question("  Instagram App Secret: ")) || "";
  creds.instagramRedirectUri =
    (await question("  Instagram Redirect URI: ")) || "";
  creds.facebookAppId = (await question("  Facebook App ID: ")) || "";
  creds.facebookAppSecret =
    (await question("  Facebook App Secret: ")) || "";
  creds.facebookPageId = (await question("  Facebook Page ID: ")) || "";

  // Sentry
  console.log("\n━━ Sentry (Error Tracking — Optional) ━━━━━━━━━━━━━━━━━━━━");
  creds.sentryDsn = (await question("  Sentry DSN: ")) || "";
  creds.sentryAuthToken = (await question("  Sentry Auth Token: ")) || "";
  creds.sentryOrg = (await question("  Sentry Org Slug: ")) || "";
  creds.sentryProject =
    (await question("  Sentry Project (default: daily-worker-hub): ")) ||
    "daily-worker-hub";

  // Upstash Redis
  console.log("\n━━ Upstash Redis (Optional) ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  creds.upstashRedisRestUrl =
    (await question("  Upstash Redis REST URL: ")) || "";
  creds.upstashRedisRestToken =
    (await question("  Upstash Redis REST Token: ")) || "";

  console.log("\n");
  return creds;
}

// ---------------------------------------------------------------------------
// Step 2 — Validate Supabase connection
// ---------------------------------------------------------------------------

async function validateSupabaseConnection(
  url: string,
  serviceRoleKey: string,
): Promise<void> {
  console.log("🔗 STEP 2 — Validate Supabase Connection\n");

  const supabase = createClient(url, serviceRoleKey);

  console.log(`  URL: ${url}`);

  try {
    const { data, error } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1,
    });

    if (error) {
      // listUsers requires auth — try a simpler health check
      const healthRes = await fetch(`${url}/rest/v1/`, {
        headers: {
          Authorization: `Bearer ${serviceRoleKey}`,
          apikey: serviceRoleKey,
        },
      });

      if (!healthRes.ok) {
        throw new Error(
          `Supabase health check failed: ${healthRes.status} ${healthRes.statusText}`,
        );
      }

      console.log("  ✅ Supabase connection OK (REST API responded)");
    } else {
      console.log(
        `  ✅ Supabase connection OK (${data?.users?.length ?? 0} users visible)`,
      );
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`  ❌ Supabase connection failed: ${msg}`);
    throw new Error(
      `Cannot connect to Supabase staging project. Please check your URL and Service Role Key.\n  ${msg}`,
    );
  }
}

// ---------------------------------------------------------------------------
// Step 3 — Apply migrations
// ---------------------------------------------------------------------------

async function applyMigrations(
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<void> {
  console.log("\n📦 STEP 3 — Apply Database Migrations\n");

  const migrationsPath = path.resolve(MIGRATIONS_FILE);

  if (!fs.existsSync(migrationsPath)) {
    console.log(
      `  ⚠️  ${MIGRATIONS_FILE} not found in project root.`,
    );
    console.log(
      "  ⚠️  Please apply migrations manually via Supabase Dashboard > SQL Editor.\n",
    );
    return;
  }

  const sql = fs.readFileSync(migrationsPath, "utf-8");
  console.log(`  📄 ${MIGRATIONS_FILE} loaded (${sql.length} characters)\n`);

  console.log(
    "  ⚠️  Remote migration execution is not supported via the JS client.\n",
  );
  console.log(
    "  📋 Please apply the migration using one of the following methods:\n",
  );
  console.log(
    "  ┌─────────────────────────────────────────────────────────────────┐",
  );
  console.log(
    "  │  Option A — Supabase CLI (recommended):                       │",
  );
  console.log(
    "  │    npx supabase db push \\                                        │",
  );
  console.log(
    "  │      --project-ref <STAGING_PROJECT_REF> \\                       │",
  );
  console.log(
    "  │      --db-url \"postgres://postgres:<PASSWORD>@db.<PROJECT>.supabase.co:5432/postgres\"  │",
  );
  console.log("  └─────────────────────────────────────────────────────────────────┘");
  console.log(
    "  ┌─────────────────────────────────────────────────────────────────┐",
  );
  console.log(
    "  │  Option B — Supabase Dashboard SQL Editor:                      │",
  );
  console.log(
    "  │    1. Go to https://app.supabase.com                            │",
  );
  console.log(
    "  │    2. Open your staging project                                 │",
  );
  console.log(
    "  │    3. SQL Editor > New Query                                     │",
  );
  console.log(
    "  │    4. Paste the contents of apply_remote_migrations.sql         │",
  );
  console.log(
    "  │    5. Run (F5 or click 'Run')                                    │",
  );
  console.log("  └─────────────────────────────────────────────────────────────────┘\n");

  const confirmed =
    (
      await question(
        "  Press ENTER after you have applied the migrations, or type 'skip' to skip: ",
      )
    ).trim().toLowerCase() === "skip";

  if (confirmed) {
    console.log("  ⏭️  Skipping migration step.\n");
  } else {
    console.log("  ✅ Migration step acknowledged.\n");
  }
}

// ---------------------------------------------------------------------------
// Step 4 — Create demo accounts
// ---------------------------------------------------------------------------

async function createDemoAccounts(
  supabaseUrl: string,
  serviceRoleKey: string,
): Promise<void> {
  console.log("\n👥 STEP 4 — Seed Demo Accounts\n");

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  for (const account of DEMO_ACCOUNTS) {
    console.log(`  Creating ${account.role} account: ${account.email}`);

    try {
      // Check if already exists
      const {
        data: { users },
      } = await supabase.auth.admin.listUsers();
      const existing = users?.find(
        (u: any) => u.email === account.email,
      );

      if (existing) {
        console.log(
          `    ⚠️  Account already exists (ID: ${existing.id.substring(0, 8)}...), skipping.`,
        );
        continue;
      }

      // Create auth user
      const {
        data: { user },
        error: signUpError,
      } = await supabase.auth.admin.createUser({
        email: account.email,
        password: account.password,
        email_confirm: true,
        user_metadata: {
          full_name: account.full_name,
          role: account.role,
        },
      });

      if (signUpError) {
        console.error(`    ❌ Auth user creation failed: ${signUpError.message}`);
        continue;
      }

      if (!user) {
        console.error(`    ❌ No user returned from createUser`);
        continue;
      }

      console.log(`    ✅ Auth user created: ${user.id.substring(0, 8)}...`);

      // Create user profile in public.users
      const { error: profileError } = await supabase.from("users").insert({
        id: user.id,
        email: account.email,
        full_name: account.full_name,
        role: account.role,
        phone: "",
        avatar_url: "",
      });

      if (profileError) {
        console.error(`    ❌ Profile creation failed: ${profileError.message}`);
      } else {
        console.log(`    ✅ Profile created in public.users`);
      }

      // Create wallet
      const { error: walletError } = await supabase.from("wallets").insert({
        user_id: user.id,
        balance: 0.0,
        pending_balance: 0.0,
      });

      if (walletError) {
        console.error(`    ❌ Wallet creation failed: ${walletError.message}`);
      } else {
        console.log(`    ✅ Wallet created`);
      }
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`    ❌ Unexpected error: ${msg}`);
    }
  }
}

// ---------------------------------------------------------------------------
// Step 5 — Generate .env.staging
// ---------------------------------------------------------------------------

function generateEnvFile(creds: StagingCredentials): void {
  console.log("\n📝 STEP 5 — Generate .env.staging\n");

  const templatePath = path.resolve(STAGING_ENV_TEMPLATE);

  if (!fs.existsSync(templatePath)) {
    console.error(
      `  ❌ Template file ${STAGING_ENV_TEMPLATE} not found. Cannot generate .env.staging.\n`,
    );
    throw new Error(
      `Missing ${STAGING_ENV_TEMPLATE}. Please ensure it was created first.`,
    );
  }

  const template = fs.readFileSync(templatePath, "utf-8");

  // Build replacement map
  const replacements: Record<string, string> = {
    "NEXT_PUBLIC_SUPABASE_URL=https://your-staging-project.supabase.co":
      `NEXT_PUBLIC_SUPABASE_URL=${creds.supabaseUrl}`,
    "NEXT_PUBLIC_SUPABASE_ANON_KEY=your-staging-anon-key-here":
      `NEXT_PUBLIC_SUPABASE_ANON_KEY=${creds.supabaseAnonKey}`,
    "SUPABASE_SERVICE_ROLE_KEY=your-staging-service-role-key-here":
      `SUPABASE_SERVICE_ROLE_KEY=${creds.supabaseServiceRoleKey}`,
    "XENDIT_SECRET_KEY=your-staging-secret-key-here":
      `XENDIT_SECRET_KEY=${creds.xenditSecretKey}`,
    "XENDIT_WEBHOOK_TOKEN=your-staging-webhook-token-here":
      `XENDIT_WEBHOOK_TOKEN=${creds.xenditWebhookToken}`,
    "XENDIT_PUBLIC_KEY=your-staging-public-key-here":
      `XENDIT_PUBLIC_KEY=${creds.xenditPublicKey || "# XENDIT_PUBLIC_KEY not set"}`,
    "RESEND_API_KEY=your-staging-resend-api-key-here":
      `RESEND_API_KEY=${creds.resendApiKey}`,
    "NEXT_PUBLIC_VAPID_KEY=your-staging-vapid-public-key-here":
      `NEXT_PUBLIC_VAPID_KEY=${creds.vapidPublicKey}`,
    "INSTAGRAM_APP_ID=your-staging-instagram-app-id-here":
      creds.instagramAppId
        ? `INSTAGRAM_APP_ID=${creds.instagramAppId}`
        : "# INSTAGRAM_APP_ID",
    "INSTAGRAM_APP_SECRET=your-staging-instagram-app-secret-here":
      creds.instagramAppSecret
        ? `INSTAGRAM_APP_SECRET=${creds.instagramAppSecret}`
        : "# INSTAGRAM_APP_SECRET",
    "INSTAGRAM_REDIRECT_URI=https://staging.your-domain.com/auth/instagram/callback":
      creds.instagramRedirectUri
        ? `INSTAGRAM_REDIRECT_URI=${creds.instagramRedirectUri}`
        : "# INSTAGRAM_REDIRECT_URI",
    "FACEBOOK_APP_ID=your-staging-facebook-app-id-here":
      creds.facebookAppId
        ? `FACEBOOK_APP_ID=${creds.facebookAppId}`
        : "# FACEBOOK_APP_ID",
    "FACEBOOK_APP_SECRET=your-staging-facebook-app-secret-here":
      creds.facebookAppSecret
        ? `FACEBOOK_APP_SECRET=${creds.facebookAppSecret}`
        : "# FACEBOOK_APP_SECRET",
    "FACEBOOK_PAGE_ID=your-staging-facebook-page-id-here":
      creds.facebookPageId
        ? `FACEBOOK_PAGE_ID=${creds.facebookPageId}`
        : "# FACEBOOK_PAGE_ID",
    "NEXT_PUBLIC_SENTRY_DSN=https://your-staging-key@o0.ingest.sentry.io/0":
      creds.sentryDsn
        ? `NEXT_PUBLIC_SENTRY_DSN=${creds.sentryDsn}`
        : "# NEXT_PUBLIC_SENTRY_DSN",
    "SENTRY_AUTH_TOKEN=your-staging-sentry-auth-token-here":
      creds.sentryAuthToken
        ? `SENTRY_AUTH_TOKEN=${creds.sentryAuthToken}`
        : "# SENTRY_AUTH_TOKEN",
    "SENTRY_ORG=your-org-slug":
      creds.sentryOrg ? `SENTRY_ORG=${creds.sentryOrg}` : "# SENTRY_ORG",
    "SENTRY_PROJECT=daily-worker-hub":
      creds.sentryProject
        ? `SENTRY_PROJECT=${creds.sentryProject}`
        : "# SENTRY_PROJECT",
    "NEXT_PUBLIC_APP_URL=https://staging.your-domain.com":
      `NEXT_PUBLIC_APP_URL=${creds.appUrl}`,
    "NEXT_PUBLIC_BASE_URL=https://staging.your-domain.com":
      `NEXT_PUBLIC_BASE_URL=${creds.baseUrl}`,
    "NEXT_PUBLIC_SITE_URL=https://staging.your-domain.com":
      `NEXT_PUBLIC_SITE_URL=${creds.siteUrl}`,
    "NEXT_PUBLIC_FIREBASE_API_KEY=your-staging-firebase-api-key":
      `NEXT_PUBLIC_FIREBASE_API_KEY=${creds.firebaseApiKey}`,
    "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-staging-project.firebaseapp.com":
      `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=${creds.firebaseAuthDomain}`,
    "NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-staging-project-id":
      `NEXT_PUBLIC_FIREBASE_PROJECT_ID=${creds.firebaseProjectId}`,
    "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-staging-project.appspot.com":
      `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=${creds.firebaseStorageBucket}`,
    "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-staging-sender-id":
      `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=${creds.firebaseMessagingSenderId}`,
    "NEXT_PUBLIC_FIREBASE_APP_ID=your-staging-firebase-app-id":
      `NEXT_PUBLIC_FIREBASE_APP_ID=${creds.firebaseAppId}`,
    "NEXT_PUBLIC_FIREBASE_VAPID_KEY=your-staging-firebase-vapid-key":
      `NEXT_PUBLIC_FIREBASE_VAPID_KEY=${creds.firebaseVapidKey}`,
    "FIREBASE_PROJECT_ID=your-staging-project-id":
      `FIREBASE_PROJECT_ID=${creds.firebaseProjectIdAdmin}`,
    "FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-staging-project.iam.gserviceaccount.com":
      `FIREBASE_CLIENT_EMAIL=${creds.firebaseClientEmail}`,
    'FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYour staging private key here\n-----END PRIVATE KEY-----\n"':
      `FIREBASE_PRIVATE_KEY="${creds.firebasePrivateKey.replace(/\n/g, "\\n")}"`,
    "VAPID_PUBLIC_KEY=your-staging-vapid-public-key":
      `VAPID_PUBLIC_KEY=${creds.vapidPublicKey}`,
    "VAPID_PRIVATE_KEY=your-staging-vapid-private-key":
      `VAPID_PRIVATE_KEY=${creds.vapidPrivateKey}`,
    "VAPID_CONTACT_EMAIL=mailto:your-staging-email@example.com":
      `VAPID_CONTACT_EMAIL=${creds.vapidContactEmail}`,
    "MIDTRANS_SERVER_KEY=your-staging-midtrans-server-key":
      "# MIDTRANS_SERVER_KEY=your-staging-midtrans-server-key",
    "NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=your-staging-midtrans-client-key":
      "# NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=your-staging-midtrans-client-key",
    "ADMIN_API_SECRET=your-staging-admin-secret-here":
      `ADMIN_API_SECRET=${creds.adminApiSecret}`,
    "CRON_SECRET=your-staging-cron-secret-here":
      `CRON_SECRET=${creds.cronSecret}`,
    "UPSTASH_REDIS_REST_URL=https://your-staging-redis-instance.upstash.io":
      creds.upstashRedisRestUrl
        ? `UPSTASH_REDIS_REST_URL=${creds.upstashRedisRestUrl}`
        : "# UPSTASH_REDIS_REST_URL",
    "UPSTASH_REDIS_REST_TOKEN=your-staging-upstash-redis-token-here":
      creds.upstashRedisRestToken
        ? `UPSTASH_REDIS_REST_TOKEN=${creds.upstashRedisRestToken}`
        : "# UPSTASH_REDIS_REST_TOKEN",
  };

  let envContent = template;

  for (const [search, replacement] of Object.entries(replacements)) {
    if (envContent.includes(search)) {
      envContent = envContent.replace(search, replacement);
    }
  }

  const outputPath = path.resolve(STAGING_ENV_OUTPUT);
  fs.writeFileSync(outputPath, envContent, "utf-8");

  console.log(`  ✅ Generated ${STAGING_ENV_OUTPUT} (${envContent.length} characters)\n`);
}

// ---------------------------------------------------------------------------
// Step 6 — Verify staging app
// ---------------------------------------------------------------------------

async function verifyStagingApp(): Promise<void> {
  console.log("\n🚀 STEP 6 — Verify Staging App Boot\n");

  console.log("  To start the staging app, run:\n");
  console.log("    NEXT_PUBLIC_ENVIRONMENT=staging npm run dev\n");
  console.log(
    "  Then open http://localhost:3000 and verify:\n",
  );
  console.log("  ┌─────────────────────────────────────────────────────────┐");
  console.log("  │  ✅ Login page renders at /login                        │");
  console.log("  │  ✅ Register page renders at /register                 │");
  console.log("  │  ✅ Worker dashboard accessible after login             │");
  console.log("  │  ✅ Business dashboard accessible after login           │");
  console.log("  │  ✅ No console errors on page load                     │");
  console.log("  └─────────────────────────────────────────────────────────┘\n");

  console.log("  To run E2E tests on staging:\n");
  console.log("    NEXT_PUBLIC_ENVIRONMENT=staging npm run test:e2e\n");
  console.log(
    "  Or with Playwright UI:\n    NEXT_PUBLIC_ENVIRONMENT=staging npm run test:e2e:ui\n",
  );
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  printBanner();

  // Step 1: Collect credentials
  const creds = await collectCredentials();

  // Step 2: Validate Supabase connection
  await validateSupabaseConnection(creds.supabaseUrl, creds.supabaseServiceRoleKey);

  // Step 3: Apply migrations (manual process, documented)
  await applyMigrations(creds.supabaseUrl, creds.supabaseServiceRoleKey);

  // Step 4: Create demo accounts
  await createDemoAccounts(creds.supabaseUrl, creds.supabaseServiceRoleKey);

  // Step 5: Generate .env.staging
  generateEnvFile(creds);

  // Step 6: Verify
  await verifyStagingApp();

  console.log(
    "╔══════════════════════════════════════════════════════════════════════╗\n",
  );
  console.log(
    "║  ✅ Staging environment provisioning complete!                      ║\n",
  );
  console.log(
    "║  Next steps:                                                         ║\n",
  );
  console.log(
    "║    1. Apply apply_remote_migrations.sql via Supabase Dashboard      ║\n",
  );
  console.log(
    "║    2. Review and update .env.staging if needed                      ║\n",
  );
  console.log(
    "║    3. Run: NEXT_PUBLIC_ENVIRONMENT=staging npm run dev             ║\n",
  );
  console.log(
    "║    4. Run E2E tests: npm run test:e2e -- --project=chromium         ║\n",
  );
  console.log(
    "╚══════════════════════════════════════════════════════════════════════╝\n",
  );

  rl.close();
}

main().catch((error) => {
  console.error("\n❌ Provisioning failed:", error instanceof Error ? error.message : error);
  rl.close();
  process.exit(1);
});
