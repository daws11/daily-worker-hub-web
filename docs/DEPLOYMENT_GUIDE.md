# Daily Worker Hub — Deployment Guide

**Complete deployment reference for the Daily Worker Hub Next.js application (Vercel + Supabase).**

This guide covers the full deployment lifecycle: environment setup, CI/CD pipeline, database migrations, rollback procedures, and configuration management. It is intended for team members of all skill levels. Exact commands are provided for every procedure.

For local development setup, see [SETUP.md](SETUP.md). For a full production env var checklist, see [PRODUCTION_ENVIRONMENT_CHECKLIST.md](PRODUCTION_ENVIRONMENT_CHECKLIST.md). For database backup and restore procedures, see [backup-restore.md](backup-restore.md).

---

## 📑 Table of Contents

1. [📋 Environment Setup](#-environment-setup)
2. [🚀 CI/CD Pipeline](#-cicd-pipeline)
3. [🗄️ Database Migrations](#️-database-migrations)
4. [↩️ Rollback Procedures](#️-rollback-procedures)
5. [🔐 Configuration Management](#️-configuration-management)

---

## 📋 Environment Setup

This section covers all environment variables required to run Daily Worker Hub locally and in production, how to configure them in Vercel, and how to manage secrets safely.

**Screenshots:**
- Vercel environment variables dashboard: `screenshots/vercel-env-vars.png` *(TODO: capture)*
- Supabase project API settings: `screenshots/supabase-project-settings.png` *(TODO: capture)*

---

### Prerequisites

Before deploying, ensure you have access to the following accounts:

- [ ] **Vercel account** — https://vercel.com (login with GitHub to enable automatic deployments)
- [ ] **Supabase account** — https://supabase.com (create a project for production)
- [ ] **Xendit account** — https://dashboard.xendit.co (for payment processing)
- [ ] **Firebase project** — https://console.firebase.google.com (for push notifications)
- [ ] **Sentry account** — https://sentry.io (for error tracking)
- [ ] **Resend account** — https://resend.com (for transactional email)

---

### Local Development Environment Setup

#### 1. Clone the repository

```bash
git clone https://github.com/your-org/daily-worker-hub-web.git
cd daily-worker-hub-web
```

#### 2. Install dependencies

```bash
pnpm install
```

#### 3. Configure local environment variables

Copy the environment template to create your local configuration:

```bash
cp .env.local.example .env.local
```

Edit `.env.local` with your Supabase local credentials:

```bash
# Supabase Configuration
# For local development: http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key-here
```

> **Note:** For local Supabase development, run `supabase start` to start the local instance. The local instance URL and keys will be printed to the terminal.

#### 4. Start Supabase locally (requires Docker)

```bash
# Start local Supabase services (Postgres, Auth, Storage, etc.)
supabase start

# Apply migrations to local database
supabase db push
```

#### 5. Start the development server

```bash
pnpm run dev
```

The app will be available at http://localhost:3000.

---

### Production Environment Setup

#### 1. Create a Supabase production project

- Go to https://supabase.com/dashboard and create a new project.
- Note the **Project URL** and **API keys** from **Settings → API**.
- Run all local migrations against the production database:

```bash
# Set production Supabase credentials
export SUPABASE_URL=https://your-project.supabase.co
export SUPABASE_ANON_KEY=your-anon-key
export SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# Push all migrations to production
supabase db push --project-ref your-project-ref
```

> **Screenshot:** Supabase API settings page — `screenshots/supabase-migrations.png` *(TODO: capture)*

#### 2. Configure environment variables in Vercel

Go to your project in the **Vercel Dashboard → Settings → Environment Variables**.

Add each variable with the appropriate scope (`Production`, `Preview`, or `Development`):

| Variable | Required | Scope | Description |
|----------|----------|-------|-------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Yes | Production | Supabase project URL (e.g., `https://xxx.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Yes | Production | Supabase anonymous (public) key |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Production | Supabase service role key — **never expose to browser** |
| `NEXT_PUBLIC_APP_URL` | Yes | Production | Production app URL (e.g., `https://yourdomain.com`) |
| `NEXT_PUBLIC_BASE_URL` | Yes | Production | Base application URL |
| `NEXT_PUBLIC_SITE_URL` | Yes | Production | Site URL for cookies and redirects |
| `XENDIT_SECRET_KEY` | Yes | Production | Xendit production secret key — **sensitive** |
| `XENDIT_WEBHOOK_TOKEN` | Yes | Production | Xendit webhook verification token — **sensitive** |
| `XENDIT_PUBLIC_KEY` | No | Production | Xendit public key |
| `NEXT_PUBLIC_VAPID_KEY` | Yes | Production | VAPID public key for web push notifications |
| `VAPID_PUBLIC_KEY` | Yes | Production | VAPID public key |
| `VAPID_PRIVATE_KEY` | Yes | Production | VAPID private key — **sensitive** |
| `FIREBASE_PROJECT_ID` | Yes | Production | Firebase project ID |
| `FIREBASE_CLIENT_EMAIL` | Yes | Production | Firebase admin service account email — **sensitive** |
| `FIREBASE_PRIVATE_KEY` | Yes | Production | Firebase admin private key — **sensitive** |
| `RESEND_API_KEY` | Yes | Production | Resend API key for transactional email — **sensitive** |
| `NEXT_PUBLIC_SENTRY_DSN` | Yes | Production | Sentry DSN for error tracking |
| `SENTRY_ORG` | Yes | Production | Sentry organization slug |
| `SENTRY_PROJECT` | Yes | Production | Sentry project name |
| `SENTRY_AUTH_TOKEN` | No | Production | Sentry auth token — **sensitive, CI/CD only** |
| `ADMIN_API_SECRET` | Yes | Production | Secret key for admin API endpoints — **sensitive** |
| `CRON_SECRET` | Yes | Production | Secret key for cron job endpoints — **sensitive** |
| `INSTAGRAM_APP_ID` | No | Production | Instagram Basic Display App ID |
| `INSTAGRAM_APP_SECRET` | No | Production | Instagram Basic Display App Secret — **sensitive** |
| `INSTAGRAM_REDIRECT_URI` | No | Production | Instagram OAuth redirect URI |
| `FACEBOOK_APP_ID` | No | Production | Facebook Graph API App ID |
| `FACEBOOK_APP_SECRET` | No | Production | Facebook Graph API App Secret — **sensitive** |
| `FACEBOOK_PAGE_ID` | No | Production | Facebook Page ID |
| `MIDTRANS_SERVER_KEY` | No | Production | Midtrans server key (alternative to Xendit) — **sensitive** |
| `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` | No | Production | Midtrans client key |
| `MIDTRANS_IS_PRODUCTION` | No | Production | Set to `true` for production |
| `UPSTASH_REDIS_REST_URL` | No | Production | Upstash Redis REST URL — **sensitive** |
| `UPSTASH_REDIS_REST_TOKEN` | No | Production | Upstash Redis REST token — **sensitive** |

> **Screenshot:** Vercel environment variables page — `screenshots/vercel-env-vars.png` *(TODO: capture)*

> **Note on secrets:** Variables marked **sensitive** must never be prefixed with `NEXT_PUBLIC_` and must only be set in the Vercel dashboard, never committed to the repository.

#### 3. Configure OAuth redirect URIs

If your app uses social login (Instagram or Facebook), update the redirect URIs in the respective developer portals:

**Instagram (Facebook Developer Portal):**
```
https://your-domain.com/auth/instagram/callback
```

**Facebook:**
```
https://your-domain.com/auth/facebook/callback
```

> **Screenshot:** Facebook Developer Portal OAuth settings — `screenshots/facebook-oauth-settings.png` *(TODO: capture)*

#### 4. Configure Xendit webhooks

In the **Xendit Dashboard → Developers → Webhooks**, add your production webhook URL:

```
https://your-domain.com/api/webhooks/xendit
```

Set the webhook token to match `XENDIT_WEBHOOK_TOKEN` in your environment variables.

> **Screenshot:** Xendit webhook configuration — `screenshots/xendit-webhook-settings.png` *(TODO: capture)*

---

### Environment Variable Quick Reference

For the complete production environment variable reference, see [PRODUCTION_ENVIRONMENT_CHECKLIST.md](PRODUCTION_ENVIRONMENT_CHECKLIST.md).

For local development setup with database schema details, see [SETUP.md](SETUP.md).

```bash
# Core (required for all environments)
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...   # server-side only
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
NEXT_PUBLIC_SITE_URL=https://yourdomain.com

# Payments (Xendit)
XENDIT_SECRET_KEY=xnd_production_...   # sensitive
XENDIT_WEBHOOK_TOKEN=...               # sensitive

# Push Notifications (Firebase/VAPID)
NEXT_PUBLIC_VAPID_KEY=...
VAPID_PRIVATE_KEY=...                 # sensitive

# Email (Resend)
RESEND_API_KEY=re_...                  # sensitive

# Error Tracking (Sentry)
NEXT_PUBLIC_SENTRY_DSN=https://xxx@o.ingest.sentry.io/xxx

# Security
ADMIN_API_SECRET=...                   # sensitive, min 32 chars
CRON_SECRET=...                        # sensitive, min 32 chars
```

---

## 🚀 CI/CD Pipeline

This section describes the automated build, test, and deployment pipeline for Daily Worker Hub. All deployments are powered by Vercel with GitHub integration. Every pull request gets an isolated preview deployment; merges to `main` trigger a production deployment automatically.

---

### Pipeline Overview

```
┌─────────────┐    push/PR    ┌──────────────────┐    success    ┌─────────────────┐
│  Developer  │ ─────────────▶│  Vercel Build    │ ────────────▶│  Vercel Deploy  │
│  (GitHub)    │               │  (install, lint, │               │  (preview or    │
│              │               │   build, test)   │               │   production)   │
└─────────────┘               └──────────────────┘               └─────────────────┘
```

**Three environments:**

| Environment | Trigger | URL pattern |
|-------------|---------|-------------|
| **Preview** | Every push to any branch | `https://<project>-<branch>.vercel.app` |
| **Production** | Merge to `main` / `master` | `https://daily-worker-hub.vercel.app` |
| **Local** | `pnpm run dev` on developer machine | `http://localhost:3000` |

---

### Available npm Scripts

All scripts are run with `pnpm run <script>`. Do not use `npm` or `yarn` — the project uses pnpm workspaces.

#### Development

```bash
pnpm run dev          # Start Next.js dev server with hot reload (http://localhost:3000)
```

#### Build & Start

```bash
pnpm run build        # Build Next.js app for production (uses --webpack compiler)
pnpm run start        # Start the production Next.js server (after build)
```

> **Important:** Always run `pnpm run build` before `pnpm run start`. Never run `pnpm run start` on a fresh clone without building first.

#### Code Quality

```bash
pnpm run lint         # Run ESLint on the entire codebase
pnpm run type-check   # Run TypeScript compiler in check mode (no emit)
pnpm run format       # Run Prettier to format all source files in place
pnpm run lint:translations   # Run custom script to lint i18n translation files
```

**Pre-commit hook:** It is recommended to run the following before every commit:

```bash
pnpm run type-check && pnpm run lint && pnpm run lint:translations
```

#### Testing

```bash
pnpm run test              # Run Vitest unit/integration tests in watch mode
pnpm run test:run           # Run Vitest tests once (CI-friendly, non-interactive)
pnpm run test:ui            # Run Vitest with the browser-based test runner UI
pnpm run test:coverage      # Run Vitest with coverage report
pnpm run test:e2e           # Run Playwright end-to-end tests headlessly
pnpm run test:e2e:ui        # Run Playwright E2E tests with the Playwright UI
pnpm run test:e2e:debug      # Run Playwright E2E tests in debug mode
```

**E2E business flow tests** (each is an independent test runner):

```bash
pnpm run test:e2e:business-topup          # Test business wallet top-up flow
pnpm run test:e2e:worker-withdrawal        # Test worker salary withdrawal flow
pnpm run test:e2e:error-handling           # Test error states and edge cases
pnpm run test:e2e:emergency-cancellation   # Test emergency cancellation by admin
pnpm run test:e2e:business-cancellation    # Test business-initiated cancellation
pnpm run test:e2e:repeated-cancellations   # Test repeated cancellation rate limiting
```

---

### Vercel Cron Jobs

The `vercel.json` file configures scheduled cron jobs that run in the Vercel infrastructure:

| Cron Job | Schedule | Endpoint | Purpose |
|----------|----------|----------|---------|
| `release-pending-payments` | Every hour (`0 * * * *`) | `/api/cron/release-pending-payments` | Automatically releases pending worker payments |

> **Screenshot:** Vercel cron job dashboard — `screenshots/vercel-cron-jobs.png` *(TODO: capture)*

**Cron job security:** All cron endpoints must verify the `CRON_SECRET` header to prevent unauthorized execution:

```typescript
// Example cron endpoint guard
if (req.headers.get('x-cron-secret') !== process.env.CRON_SECRET) {
  return res.status(401).json({ error: 'Unauthorized' });
}
```

**Viewing cron job logs:** In the Vercel dashboard, go to **Deployments → [Production Deployment] → Functions** to view cron execution logs.

---

### Pre-Deployment Checklist

Before merging to `main`, run through this checklist:

- [ ] `pnpm run type-check` passes with zero errors
- [ ] `pnpm run lint` reports zero warnings
- [ ] `pnpm run lint:translations` passes
- [ ] `pnpm run test:run` passes (all Vitest tests green)
- [ ] `pnpm run test:e2e` passes (all Playwright E2E tests green on local)
- [ ] All new environment variables are added to Vercel dashboard
- [ ] Database migrations have been pushed to production (`supabase db push`)
- [ ] Sentry source maps have been uploaded (handled automatically by `@sentry/nextjs`)
- [ ] Xendit webhook URL is reachable and returning HTTP 200
- [ ] Firebase service account credentials are up to date

---

### Deployment Steps

#### Deploying a Preview (for a pull request)

Vercel creates a preview automatically for every push to a GitHub branch. To manually trigger a preview:

```bash
# Push your branch to GitHub
git push origin feature/my-new-feature
```

The Vercel GitHub App will automatically create a preview deployment. The preview URL will be posted as a comment on the pull request.

#### Deploying to Production

**Option A — via GitHub merge:**

```bash
# 1. Ensure all checks pass on your PR
git checkout main
git pull origin main

# 2. Merge your feature branch
git merge feature/my-new-feature
git push origin main
```

Vercel automatically detects the push to `main` and deploys to production.

**Option B — via Vercel CLI:**

```bash
# Install Vercel CLI if not already installed
npm install -g vercel

# Login to Vercel
vercel login

# Deploy to production from the project root
vercel --prod
```

#### Verifying a Production Deployment

After a production deployment completes:

1. **Check the Vercel dashboard** — confirm the deployment status is ✅ "Ready" (green).
2. **Run smoke tests** against the production URL:

```bash
pnpm run test:e2e
```

3. **Check Sentry** for any new errors spike at https://sentry.io.
4. **Check Supabase dashboard** for any unusual query performance.
5. **Test a real payment flow** in staging mode before relying on production.

---

### Deployment Rollback (Quick Reference)

For full rollback procedures, see [↩️ Rollback Procedures](#️-rollback-procedures).

To instantly roll back to the previous deployment via the Vercel dashboard:

1. Go to **Deployments** in the Vercel dashboard.
2. Find the previous **"Ready"** deployment.
3. Click **⋯** (three dots) → **Promote to Production**.

To roll back via Vercel CLI:

```bash
vercel rollback
```

This immediately reverts the production deployment to the last known good state.

---

## 🗄️ Database Migrations

Database schema changes are managed via SQL migration files in the `migrations/` directory. Every change to the production schema — adding columns, creating tables, modifying indexes, or updating RLS policies — must go through a migration. Direct `ALTER TABLE` statements in the Supabase dashboard are not used; all schema changes are code-driven and version-controlled.

> **Important:** Always back up the database before running migrations in production. See [backup-restore.md](backup-restore.md) for backup procedures, or use `scripts/backup-supabase.sh` for automated backups.

---

### Migration File Structure

Migration files live in the `migrations/` directory at the project root. Two naming conventions are used:

| Convention | Pattern | Example |
|-----------|---------|---------|
| **Timestamped** (preferred for sequential ordering) | `YYYYMMDDHHMMSS_description.sql` | `20260223_add_notification_preferences.sql` |
| **Named** (for initial schema or independent changes) | `description.sql` | `add_conversations_table.sql` |

Every migration file follows a consistent structure — modelled after the examples in `migrations/` — using section comments to group related operations:

```sql
-- ============================================================================
-- [Migration Title]
-- ============================================================================
-- [One-line description of what this migration does and why]
-- Version: YYYYMMDD
-- ============================================================================

-- ----------------------------------------------------------------------------
-- [Section Name]
-- ----------------------------------------------------------------------------
[SQL statements]

-- ----------------------------------------------------------------------------
-- [Comments for documentation]
-- ----------------------------------------------------------------------------
COMMENT ON TABLE ... IS '...';
COMMENT ON COLUMN ... IS '...';

-- ----------------------------------------------------------------------------
-- [Indexes]
-- ----------------------------------------------------------------------------
CREATE INDEX ...

-- ----------------------------------------------------------------------------
-- [Row Level Security]
-- ----------------------------------------------------------------------------
ALTER TABLE ... ENABLE ROW LEVEL SECURITY;
CREATE POLICY "..." ON ...;
```

Key conventions observed in all migrations:
- **`public.`** schema prefix on all table/column references (e.g., `public.bookings`).
- **`uuid_generate_v4()`** for primary key defaults — Supabase's standard UUID generation.
- **`TIMESTAMPTZ`** for all timestamp columns — always UTC with timezone awareness.
- **`updated_at` trigger** pattern on every table with `CREATE OR REPLACE FUNCTION update_updated_at_column()` to avoid duplicates.
- **RLS enabled** on every table. Public access is always denied; policies are explicit.
- **`IF EXISTS` / `IF NOT EXISTS`** guards on `CREATE/DROP` statements for idempotency.

---

### Local Migration Workflow

Use the Supabase CLI to run migrations against the local Docker database.

#### Prerequisites

Ensure Docker is running and Supabase CLI is installed:

```bash
# Verify Supabase CLI is available
supabase --version

# Verify Docker is running
docker ps
```

#### Running all pending migrations

```bash
# Start local Supabase services (Postgres, Auth, Storage, etc.)
supabase start

# Push all migrations from migrations/ to the local database
supabase db push
```

`supabase db push` compares the local database state against the files in `migrations/` and applies only the missing ones. It is safe to run multiple times — it is idempotent.

#### Resetting the local database

To discard all local data and reapply every migration from scratch:

```bash
# WARNING: This deletes all local data
supabase db reset
```

> **Warning:** `supabase db reset` drops and recreates the local database. Do not use this in production.

#### Inspecting migration status

```bash
# List all migrations applied to the local database and their status
supabase migration list
```

#### Applying a specific migration manually (psql)

If you need to run a single migration file directly:

```bash
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  --set ON_ERROR_STOP=on \
  --file migrations/20260223_add_notification_preferences.sql
```

Replace the connection string with the one printed by `supabase status` if it differs.

---

### Production Migration Workflow

Migrations are pushed to the Supabase hosted production database using the Supabase CLI. All migrations run within a transaction — if any statement fails, the entire migration is rolled back.

#### Prerequisites

```bash
# Login to Supabase CLI (one-time setup)
supabase login

# Link the CLI to your production project
supabase link --project-ref your-project-ref
```

> **Note:** You will be prompted for the Supabase database password during linking. Find this in **Settings → Database** in the Supabase dashboard.

#### Pushing migrations to production

```bash
# Push all pending migrations to the linked production project
supabase db push --project-ref your-project-ref
```

The CLI will:
1. Compare local migration files against the production database's migration history.
2. Show a diff of the SQL that will be applied.
3. Prompt for confirmation before executing.
4. Apply each migration in a transaction.

To skip the confirmation prompt (useful for CI/CD):

```bash
supabase db push --project-ref your-project-ref --yes
```

#### Checking production migration status

```bash
# List applied migrations in production
supabase migration list --linked
```

To verify a specific table or column exists in production:

```bash
psql "$SUPABASE_DB_URL" \
  --command "\d public.conversations"
```

> **Screenshot:** Supabase SQL Editor showing table schema — `screenshots/supabase-table-schema.png` *(TODO: capture)*

---

### Creating a New Migration

Follow this checklist when adding a new migration:

1. **Create the file** in `migrations/` with the appropriate naming convention:

```bash
touch "migrations/$(date +'%Y%m%d%H%M%S')_add_your_feature.sql"
```

2. **Write the migration** following the structure above. Every migration must:
   - Be **idempotent** — safe to run on a database that already has the change.
   - Be **fully commented** — include a table of contents header, section dividers, and `COMMENT ON` statements for every new table and column.
   - **Enable RLS** on any new table and define explicit access policies.
   - Include **`updated_at` triggers** for tables that are updated.
   - Use **`IF EXISTS` / `IF NOT EXISTS`** guards on `CREATE/DROP` statements.

3. **Test locally first:**

```bash
# Reset local DB to ensure a clean slate
supabase db reset

# Verify the migration applies cleanly
supabase db push
```

4. **Verify the migration contents:**

```bash
# Confirm the table was created with correct schema
psql "postgresql://postgres:postgres@127.0.0.1:54322/postgres" \
  --command "\d+ public.your_new_table"
```

5. **Commit the migration file** before pushing to production.

---

### Handling Migration Failures

If a migration fails during `supabase db push`:

1. **The transaction is automatically rolled back** — no partial state is left in the database.
2. Check the error message in the terminal output. Common causes:

| Error | Cause | Fix |
|-------|-------|-----|
| `duplicate key value violates unique constraint` | Migration was partially applied | Run `supabase db push` again — the CLI tracks applied migrations |
| `relation "table_name" does not exist` | Dependent migration not yet applied | Ensure all prerequisite migrations are present in `migrations/` |
| `permission denied` | Running as wrong Supabase role | Use `--db-url` with the `postgres` role connection string from Supabase dashboard |
| `syntax error at or near "..."` | SQL syntax error | Review the migration file; check for unescaped characters |

3. **Fix the migration file** and re-run `supabase db push`.

> **Never manually modify the `supabase/schema/migrations/` folder** — that folder is managed by the CLI and should not be edited directly.

---

### Rolling Back a Migration

Supabase does not support automatic rollback of applied migrations. To roll back a migration:

#### Option A — Write a compensating migration (preferred)

Create a new migration file that reverses the change:

```bash
touch "migrations/$(date +'%Y%m%d%H%M%S')_undo_add_notification_preferences.sql"
```

Example for dropping a column:

```sql
-- Undo: drop the notification preferences table
-- Applied: 20260223_add_notification_preferences.sql

ALTER TABLE public.user_notification_preferences DROP COLUMN IF EXISTS booking_notes;
DROP TABLE IF EXISTS public.user_notification_preferences;
```

Apply it the same way as any other migration:

```bash
supabase db push --project-ref your-project-ref --yes
```

#### Option B — Restore from backup

If the migration introduced critical data loss and cannot be easily compensated:

1. Identify the backup created before the migration (from `scripts/backup-supabase.sh` logs).
2. Follow the restore procedure in [backup-restore.md](backup-restore.md).
3. After restoring, **do not re-run the failing migration** — investigate and fix it first.

> **Warning:** Restoring from backup will overwrite all data changes made after the backup was taken.

---

### Automated Backup Before Migration

The `scripts/backup-supabase.sh` script creates timestamped, gzip-compressed SQL dumps of the full database before any destructive migration. Run a full backup before pushing to production:

```bash
# Create a pre-migration backup
./scripts/backup-supabase.sh --full
```

This writes a backup to `backups/daily-worker-hub-full-YYYYMMDD_HHMMSS.sql.gz` and enforces a 7-day retention policy. See `scripts/backup-supabase.sh` for full configuration options.

---

### CI/CD Migration Integration

In the automated pipeline, database migrations run as part of the pre-deployment phase. The CI/CD pipeline (see [CI/CD Pipeline](#-cicd-pipeline)) executes:

```bash
# 1. Start local Supabase (for testing)
supabase start

# 2. Apply all migrations to the local test database
supabase db push

# 3. Run database-dependent tests
pnpm run test
```

Production migrations are pushed separately, after the preview deployment is verified, to allow for a safe rollback window if the migration causes issues.

---

## ↩️ Rollback Procedures

This section describes how to roll back a broken production deployment — both the frontend application and the database — quickly and safely.

> **Always back up before rolling back.** If time permits, run `scripts/backup-supabase.sh --full` before any destructive rollback operation. See [backup-restore.md](backup-restore.md) for the full backup and restore reference.

---

### Deciding Which Rollback to Use

Use this table to choose the right rollback path based on what went wrong:

| What broke? | Roll back what? | See section |
|------------|----------------|------------|
| Bad frontend deploy (broken UI, JS errors, crashes) | Vercel deployment only | [Roll Back a Vercel Deployment](#roll-back-a-vercel-deployment) |
| Broken migration (failed `supabase db push`, wrong schema) | Database migration only | [Roll Back a Database Migration](#roll-back-a-database-migration) |
| Both a bad deploy AND a bad migration | Both — deployment first, then database | Both sections below |

---

### Roll Back a Vercel Deployment

A Vercel rollback promotes a previous successful deployment back to production without requiring a code re-deploy. The application state is restored instantly; the Supabase database is **not** affected.

#### Via the Vercel Dashboard

1. Go to **Deployments** in the [Vercel dashboard](https://vercel.com/daily-worker-hub/deployments).
2. Find the last known good deployment (status ✅ **Ready**).
3. Click **⋯** (three dots) on that deployment row.
4. Select **Promote to Production**.
5. Confirm. Vercel will update the production URL to point at the selected deployment within seconds.

#### Via the Vercel CLI

```bash
# Roll back to the previous deployment instantly
vercel rollback
```

This promotes the most recent successful production deployment. To roll back to a specific deployment:

```bash
# List recent deployments
vercel list

# Roll back to a specific deployment URL or deployment ID
vercel rollback daily-worker-hub-abc123.vercel.app
```

> **Note:** `vercel rollback` only reverts the Next.js application. Environment variables, cron jobs, and serverless function configurations are preserved as they were in the target deployment.

---

### Roll Back a Database Migration

Supabase does not support automatic rollback of applied migrations. Two options are available.

#### Option A — Compensating Migration (preferred)

For non-destructive mistakes (e.g., added an incorrect column, wrong constraint), the safest approach is to write a new migration that reverses the change.

```bash
# Create a compensating migration
touch "migrations/$(date +'%Y%m%d%H%M%S')_undo_your_migration_name.sql"
```

Example — dropping an incorrectly added column:

```sql
-- Undo: 20260223_add_subscription_tier.sql
ALTER TABLE public.users DROP COLUMN IF EXISTS subscription_tier;
```

Apply the compensating migration the same way as any other migration:

```bash
supabase db push --project-ref your-project-ref --yes
```

> **Benefit:** No data is lost. The database stays online throughout.
> **When to use:** Wrong column type, missing constraint, incorrect default, unwanted index.

#### Option B — Restore from Backup

For destructive mistakes where data integrity is at risk (e.g., `DROP TABLE`, accidental `DELETE` via a bad migration), restore from the most recent pre-migration backup.

> **⚠️ Warning:** Restoring from backup **overwrites all data** created after the backup was taken. Use only when the compensating migration approach is not feasible.

**Steps:**

1. **Confirm a recent backup exists:**

   ```bash
   ls -lh backups/daily-worker-hub-full-*.sql.gz | head -5
   ```

2. **Download or locate the backup** created before the bad migration. The `scripts/backup-supabase.sh` timestamps all backups.

3. **Extract the backup:**

   ```bash
   cd backups
   gunzip -k daily-worker-hub-full-YYYYMMDD_HHMMSS.sql.gz
   ```

4. **Restore the database:**

   ```bash
   psql "$SUPABASE_DB_URL" < daily-worker-hub-full-YYYYMMDD_HHMMSS.sql
   ```

5. **Verify key tables are present:**

   ```bash
   psql "$SUPABASE_DB_URL" -c "SELECT count(*) FROM users;"
   psql "$SUPABASE_DB_URL" -c "SELECT count(*) FROM bookings;"
   ```

6. **Do not re-apply the bad migration** — fix it locally first, then push a corrected version.

For full restore procedures and configuration, see [backup-restore.md](backup-restore.md).

---

### Pre-Rollback Backup Checklist

Run this before any rollback to preserve the current (broken) state:

- [ ] Run `scripts/backup-supabase.sh --full` to capture the current database state
- [ ] Note the current Vercel deployment URL from the dashboard
- [ ] Document the error or incident in your monitoring tool (Sentry, Slack)
- [ ] Notify the team in the `#incidents` channel (if applicable)

---

### Post-Rollback Verification

After rolling back, verify the system is healthy before announcing recovery:

1. **Check the Vercel dashboard** — confirm the deployment status is ✅ **Ready**.
2. **Test the application** — load the production URL and verify the broken behaviour is resolved.
3. **Check Sentry** — confirm no new errors are being reported.
4. **Check Supabase dashboard** — confirm database is responsive and row counts look correct.
5. **Run smoke tests:**

   ```bash
   pnpm run test:e2e
   ```

6. **Update the incident ticket** with the rollback timestamp and outcome.

---

## 🔐 Configuration Management

*(To be added in subtask 1-5 — see [implementation plan](../.auto-claude/specs/072-p1-document-deployment-process/implementation_plan.json))*
