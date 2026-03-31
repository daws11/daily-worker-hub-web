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

*(To be added in subtask 1-2 — see [implementation plan](../.auto-claude/specs/072-p1-document-deployment-process/implementation_plan.json))*

---

## 🗄️ Database Migrations

*(To be added in subtask 1-3 — see [implementation plan](../.auto-claude/specs/072-p1-document-deployment-process/implementation_plan.json))*

---

## ↩️ Rollback Procedures

*(To be added in subtask 1-4 — see [implementation plan](../.auto-claude/specs/072-p1-document-deployment-process/implementation_plan.json))*

---

## 🔐 Configuration Management

*(To be added in subtask 1-5 — see [implementation plan](../.auto-claude/specs/072-p1-document-deployment-process/implementation_plan.json))*
