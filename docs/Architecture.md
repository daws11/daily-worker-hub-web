# Architecture - Daily Worker Hub Web MVP

**Project:** Daily Worker Hub - Web MVP
**Tech Stack:** Next.js + Supabase Cloud
**Version:** 1.0
**Last Updated:** March 27, 2026

---

## 1. Deployment Architecture

### 1.1 Infrastructure Overview

```
┌─────────────────────────────────────────────────┐
│              DNS (dailyworkerhub.com)            │
│                    │                            │
│                    ▼                            │
│  ┌─────────────────────────────────────────┐    │
│  │            Vercel (CDN + Edge)           │    │
│  │  ┌─────────────────────────────────────┐ │    │
│  │  │  Next.js App (Serverless Functions) │ │    │
│  │  │  - Static Assets (Edge)             │ │    │
│  │  │  - API Routes (Serverless)           │ │    │
│  │  │  - Image Optimization                 │ │    │
│  │  └──────────────────┬──────────────────┘ │    │
│  └─────────────────────┼────────────────────┘    │
│                        │ HTTPS (auto)             │
└────────────────────────┼────────────────────────┘
                         │
          ┌──────────────┴──────────────┐
          │      Supabase Cloud           │
          │  ┌────────────────────────┐  │
          │  │  PostgreSQL (Hosted)  │  │
          │  ├────────────────────────┤  │
          │  │  Auth (JWT, OAuth)    │  │
          │  ├────────────────────────┤  │
          │  │  Realtime (WebSocket) │  │
          │  ├────────────────────────┤  │
          │  │  Storage (S3)         │  │
          │  ├────────────────────────┤  │
          │  │  Edge Functions        │  │
          │  ├────────────────────────┤  │
          │  │  Dashboard / Studio   │  │
          │  └────────────────────────┘  │
          └─────────────────────────────┘
```

### 1.2 Components

| Component             | Provider         | Purpose                                                         |
| --------------------- | ---------------- | --------------------------------------------------------------- |
| **Next.js (Vercel)** | Vercel           | React framework with serverless functions, CDN, auto SSL       |
| **Supabase Cloud**    | Supabase         | Hosted PostgreSQL, Auth, Realtime, Storage, Edge Functions      |
| **Custom Domain**     | Vercel / DNS     | Custom domain with automatic HTTPS (dailyworkerhub.com)          |
| **Sentry**             | Vercel Integr.   | Error tracking and performance monitoring                       |
| **Cron Jobs**         | Vercel Cron      | Scheduled tasks (e.g., release-pending-payments, every hour)    |
| **Email**             | Resend           | Transactional emails (notifications, receipts)                  |
| **Push Notifications**| Firebase        | Web push notifications via Firebase Cloud Messaging              |
| **Payments**          | Xendit / Midtrans | Payment gateway for top-ups and withdrawals                      |
| **Maps**              | Leaflet / OSM    | Open-source map display for worker locations                    |

---

## 2. Technology Stack

### 2.1 Frontend

| Technology          | Purpose                         | Version   |
| ------------------- | ------------------------------- | --------- |
| **Next.js**         | React Framework with App Router | 16.1+    |
| **React**           | UI Library                      | 19.2+    |
| **TypeScript**      | Type Safety                     | 5.9+     |
| **Tailwind CSS**    | Styling                         | 3.4+     |
| **shadcn/ui**       | Component Library               | Latest   |
| **Lucide React**    | Icons                           | Latest   |
| **React Hook Form** | Form Management                 | 7.71+    |
| **Zod**             | Schema Validation               | 4.3+     |
| **TanStack Query**  | Server State Management         | 5.17+    |
| **SWR**             | Data Fetching / Caching         | 2.4+     |
| **Recharts**        | Analytics Charts                | 2.15+    |
| **Sonner**          | Toast Notifications              | 2.0+     |
| **Leaflet**         | Maps (OpenStreetMap)            | 1.9+     |

### 2.2 Backend & Database

| Technology                  | Purpose                     | Version    |
| --------------------------- | --------------------------- | ---------- |
| **Supabase Cloud**          | Hosted backend-as-a-service | Latest     |
| **PostgreSQL**              | Relational database         | 15+        |
| **Supabase Auth**           | Authentication (JWT, OAuth) | Built-in   |
| **Supabase Realtime**       | Real-time subscriptions     | Built-in   |
| **Supabase Storage**        | File Storage (S3-compatible)| Built-in   |
| **Supabase Edge Functions** | Serverless Functions        | Deno-based |
| **Firebase Admin SDK**      | Server-side push notifications| 13+      |
| **Resend**                  | Email delivery API           | 4.8+      |
| **Xendit / Midtrans**       | Payment gateway APIs         | Latest    |

### 2.3 Infrastructure

| Technology       | Purpose                          | Provider                          |
| ---------------- | -------------------------------- | -------------------------------- |
| **Vercel**       | Hosting, CDN, serverless compute | Vercel (vercel.com)              |
| **Supabase Cloud** | Managed database, auth, storage | Supabase (supabase.com)          |
| **Vercel Cron**  | Scheduled background jobs        | Built-in (vercel.json configured)|
| **HTTPS / SSL**  | Automatic TLS via Vercel        | Automatic (no manual config)     |
| **Sentry**       | Error & performance monitoring   | Vercel + Sentry integration      |
| **Resend**       | Email service                    | Resend API                       |
| **Firebase**     | Push notifications               | Firebase Console                  |

### 2.4 Admin Dashboard & Community Platform

| Platform               | Framework               | Tech Stack                                                           |
| ---------------------- | ----------------------- | -------------------------------------------------------------------- |
| **Admin Dashboard**    | Next.js 14 (App Router) | shadcn/ui + Tailwind CSS + TanStack Query + Recharts + Supabase Auth |
| **Community Platform** | Next.js 14 (App Router) | shadcn/ui + Tailwind CSS + Supabase Realtime + OpenAI/Anthropic API  |

#### Admin Dashboard Features

- **User Management:** Manage business and worker accounts
- **Analytics & Reports:** Revenue, bookings, compliance metrics (Recharts)
- **Job Monitoring:** View all active jobs and applications
- **Compliance Oversight:** Monitor PP 35/2021 compliance violations
- **Dispute Resolution:** Handle payment and work disputes
- **System Settings:** Configure app-wide settings and notifications

#### Community Platform Features

- **Forum & Discussions:** Real-time threads and replies (Supabase Realtime)
- **Feedback System:** User feedback and feature requests
- **Knowledge Base:** Resources, tips, and success stories
- **Gamification:** Badges, reputation points, achievements
- **Events & Webinars:** Community events and learning sessions
- **AI-Powered Features:** Smart search, content suggestions (OpenAI/Anthropic)

---

## 3. Vercel Deployment

### 3.1 Overview

Vercel provides zero-config deployment with automatic HTTPS, global CDN, serverless functions, and seamless Git integration. The entire application is deployed as a serverless Next.js app connected to Supabase Cloud.

### 3.2 Prerequisites

Before deploying, ensure you have:

- GitHub repository with the project code
- Vercel account linked to GitHub
- Supabase Cloud project created
- All required API keys and credentials

### 3.3 Deploy Steps

#### Step 1: Connect Repository

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click **Add New Project**
3. Select the `daily-worker-hub` repository
4. Vercel will auto-detect Next.js configuration

#### Step 2: Configure Build Settings

Vercel auto-detects most settings. Verify the following:

| Setting          | Value              |
| ---------------- | ------------------ |
| **Framework**    | Next.js            |
| **Build Command**| `npm run build`    |
| **Output Dir**   | `.next`            |
| **Install Cmd**  | `npm ci`           |
| **Node.js Ver**  | 20.x               |

#### Step 3: Configure Environment Variables

In **Vercel Project Settings → Environment Variables**, add all required variables. See [Section 4](#4-supabase-cloud-configuration) for Supabase values and [Section 5](#5-environment-variables) for the full variable list.

#### Step 4: Deploy

1. Click **Deploy**
2. Vercel builds and deploys automatically on every push to the connected branch
3. A `.vercel.app` preview URL is provided after each deployment
4. For production, connect the `main` branch and promote preview deployments

---

## 4. Supabase Cloud Configuration

### 4.1 Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Choose a region closest to your users (e.g., Southeast Asia: Singapore)
3. Set a strong database password — store it securely
4. Note the **Project ID** from the project settings

### 4.2 Get API Keys

From **Supabase Dashboard → Settings → API**, retrieve:

| Variable                   | Where to Find                              |
| -------------------------- | ------------------------------------------- |
| `NEXT_PUBLIC_SUPABASE_URL` | Project URL (e.g., `https://xyz.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `anon` public key                        |
| `SUPABASE_SERVICE_ROLE_KEY`| `service_role` secret key (server-only)    |

### 4.3 Configure Row Level Security (RLS)

All tables use Supabase RLS policies to enforce access control:

```sql
-- Example: Workers can only read their own profile
CREATE POLICY "Workers can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

-- Example: Businesses can only manage their own jobs
CREATE POLICY "Businesses manage own jobs"
  ON jobs FOR ALL
  USING (auth.uid() = business_id);
```

### 4.4 Configure Realtime

Enable Realtime subscriptions for live updates:

1. Go to **Database → Replication** in Supabase Dashboard
2. Select tables to subscribe to (e.g., `bookings`, `jobs`, `messages`)
3. Enable Realtime in the Storage settings for file upload events

### 4.5 Configure Auth Settings

From **Authentication → Settings**:

- Set **Site URL** to your production domain (e.g., `https://dailyworkerhub.com`)
- Add all preview/deployment URLs to **Redirect URLs**
- Configure email templates for magic link and OTP emails
- Enable OAuth providers as needed (Google, Apple, etc.)

### 4.6 Supabase Edge Functions (Optional)

For server-side logic that needs to run close to the database:

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Initialize (if needed)
supabase init

# Deploy an edge function
supabase functions deploy my-function --project-ref <project-ref>
```

---

## 5. Environment Variables

### 5.1 Vercel Environment Variables

Configure all variables in **Vercel Project Settings → Environment Variables** for all environments (Production, Preview, Development).

```bash
# ========================================
# SUPABASE CLOUD CONFIGURATION
# ========================================
NEXT_PUBLIC_SUPABASE_URL=https://xyz.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# ========================================
# APP CONFIGURATION
# ========================================
NEXT_PUBLIC_APP_URL=https://dailyworkerhub.com
NEXT_PUBLIC_BASE_URL=https://dailyworkerhub.com
NEXT_PUBLIC_SITE_URL=https://dailyworkerhub.com

# ========================================
# PAYMENT GATEWAY (Xendit or Midtrans)
# ========================================
XENDIT_SECRET_KEY=xnd_production_...
XENDIT_WEBHOOK_TOKEN=...
XENDIT_PUBLIC_KEY=xnd_public_production_...

# ========================================
# FIREBASE / PUSH NOTIFICATIONS
# ========================================
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=xxx.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=xxx
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=xxx.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=xxx
NEXT_PUBLIC_FIREBASE_APP_ID=1:xxx:web:xxx
NEXT_PUBLIC_VAPID_KEY=xxx
VAPID_PUBLIC_KEY=xxx
VAPID_PRIVATE_KEY=xxx
FIREBASE_PROJECT_ID=xxx
FIREBASE_CLIENT_EMAIL=xxx@xxx.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nxxx\n-----END PRIVATE KEY-----\n"

# ========================================
# EMAIL (Resend)
# ========================================
RESEND_API_KEY=re_xxx

# ========================================
# ERROR TRACKING (Sentry)
# ========================================
NEXT_PUBLIC_SENTRY_DSN=https://xxx@o0.ingest.sentry.io/0
SENTRY_ORG=your-org
SENTRY_PROJECT=daily-worker-hub

# ========================================
# SECURITY
# ========================================
ADMIN_API_SECRET=$(openssl rand -base64 32)
CRON_SECRET=$(openssl rand -base64 32)
```

### 5.2 Local Development (.env.local)

For local development, use the Supabase CLI to link your local project:

```bash
# Link to Supabase project
npx supabase link --project-ref <project-ref>

# Pull remote schema (optional)
npx supabase db pull
```

---

## 6. Custom Domain & DNS

### 6.1 Configure Custom Domain in Vercel

1. Go to **Vercel Project → Settings → Domains**
2. Enter your domain (e.g., `dailyworkerhub.com`)
3. Click **Add**
4. Vercel will provide DNS records to add at your domain registrar

### 6.2 DNS Records

Add the following records at your domain registrar:

| Record Type | Name | Value                        | TTL   |
| ----------- | ---- | ---------------------------- | ----- |
| **A**       | `@`  | `76.76.21.21`                | Auto  |
| **CNAME**   | `www` | `cname.vercel-dns.com`       | Auto  |
| **CNAME**   | `*`  | `cname.vercel-dns.com`       | Auto  |

> **Note:** DNS propagation typically takes 10–60 minutes. Vercel provides automatic SSL/TLS certificates — no manual certificate management needed.

### 6.3 Verify Domain

Once DNS propagates, Vercel will automatically provision an SSL certificate and your site will be accessible at `https://dailyworkerhub.com`.

```bash
# Verify DNS is pointing correctly
dig dailyworkerhub.com
nslookup dailyworkerhub.com

# Test HTTPS
curl -I https://dailyworkerhub.com
```

---

## 7. Cron Jobs & Background Tasks

### 7.1 Vercel Cron Configuration

Scheduled tasks are defined in `vercel.json` at the project root:

```json
{
  "crons": [
    {
      "path": "/api/cron/release-pending-payments",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/expire-old-jobs",
      "schedule": "0 0 * * *"
    },
    {
      "path": "/api/cron/daily-summary",
      "schedule": "0 6 * * *"
    }
  ]
}
```

### 7.2 Cron Endpoint Requirements

All cron endpoints must:

- Be located in `app/api/cron/[name]/route.ts`
- Verify the `CRON_SECRET` header for security
- Return a `200` status code when successful

```typescript
// app/api/cron/release-pending-payments/route.ts
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Process pending payments
  // ... business logic ...

  return NextResponse.json({ success: true });
}
```

---

## 8. Monitoring & Error Tracking

### 8.1 Sentry Integration

Sentry captures errors and performance data from both client and server:

1. Create a Sentry project at [sentry.io](https://sentry.io)
2. Install the Sentry SDK:

```bash
npm install @sentry/nextjs
```

3. Configure in `sentry.client.config.ts` and `sentry.server.config.ts`
4. Set `NEXT_PUBLIC_SENTRY_DSN` in Vercel environment variables
5. Sentry is automatically integrated with Vercel via the `@sentry/nextjs` package

### 8.2 Vercel Analytics

Enable Vercel Analytics in `next.config.mjs`:

```js
// next.config.mjs
import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    // Enable Vercel Analytics
  },
};

export default nextConfig;
```

### 8.3 Uptime Monitoring

Use Vercel's built-in deployment monitoring, or configure external uptime checks:

```bash
# Example: Use a free uptime service like UptimeRobot
# Monitor: https://dailyworkerhub.com
# Check interval: 5 minutes
# Alert on: 3 consecutive failures
```

### 8.4 Logging

Vercel provides built-in log streaming for all serverless function invocations. Access logs via:

```bash
# Using Vercel CLI
vercel logs daily-worker-hub

# Filter for errors only
vercel logs daily-worker-hub --filter=error
```

---

## 9. Project Structure

### 9.1 Single-App Structure

The project is a **single Next.js application** (not a monorepo). All routes, components, and logic live under a flat `app/` directory with separate root-level directories for shared code.

```
daily-worker-hub/                      # Project root — single Next.js app
├── app/                               # Next.js App Router (Next.js 16+)
│   ├── (auth)/                        # Auth group routes (no shared layout)
│   │   ├── login/
│   │   ├── register/
│   │   ├── auth/
│   │   │   └── callback/              # OAuth callback
│   │   └── onboarding/
│   │       ├── business/
│   │       └── worker/
│   ├── (dashboard)/                   # Authenticated dashboard group
│   │   ├── business/                  # Business portal pages
│   │   │   ├── jobs/
│   │   │   ├── bookings/
│   │   │   ├── analytics/
│   │   │   ├── wallet/
│   │   │   ├── workers/
│   │   │   ├── reviews/
│   │   │   ├── settings/
│   │   │   ├── messages/
│   │   │   ├── badge-verifications/
│   │   │   ├── job-attendance/
│   │   │   ├── interviews/
│   │   │   └── compliance/
│   │   └── worker/                    # Worker portal pages
│   │       ├── jobs/
│   │       ├── applications/
│   │       ├── bookings/
│   │       ├── earnings/
│   │       ├── wallet/
│   │       ├── profile/
│   │       ├── availability/
│   │       ├── badges/
│   │       ├── achievements/
│   │       ├── attendance/
│   │       ├── settings/
│   │       └── messages/
│   ├── admin/                         # Admin dashboard pages
│   │   ├── analytics/
│   │   ├── businesses/
│   │   ├── compliance/
│   │   ├── disputes/
│   │   ├── jobs/
│   │   ├── kycs/
│   │   ├── monitoring/
│   │   ├── reports/
│   │   ├── users/
│   │   └── workers/
│   ├── api/                           # API route handlers (Next.js serverless)
│   │   ├── admin/
│   │   │   ├── cache-stats/
│   │   │   └── metrics/
│   │   ├── applications/
│   │   ├── auth/
│   │   │   └── create-profile/
│   │   ├── bookings/
│   │   ├── business/
│   │   ├── categories/
│   │   ├── cron/                      # Vercel Cron endpoints
│   │   │   ├── release-pending-payments/
│   │   │   └── expire-old-jobs/
│   │   └── webhooks/                  # Payment gateway webhooks
│   ├── jobs/                          # Public marketplace pages
│   ├── workers/                       # Public worker pages
│   ├── components/                    # App-scoped components
│   ├── docs/
│   ├── lib/
│   ├── providers/
│   ├── layout.tsx                     # Root layout
│   ├── page.tsx                       # Landing page
│   ├── error.tsx                      # Root error boundary
│   ├── global-error.tsx
│   └── globals.css
├── components/                        # Shared / root-level components
│   ├── ui/                            # shadcn/ui primitives
│   ├── applicant-list.tsx
│   ├── application-list.tsx
│   ├── error-boundary.tsx
│   ├── job-card.tsx
│   ├── notification-settings.tsx
│   ├── pwa-install-prompt.tsx
│   └── pwa-offline-banner.tsx
├── lib/                               # Shared utilities
│   ├── supabase/                      # Supabase client setup (in lib/ or env)
│   ├── firebase-admin.ts              # Firebase Admin (push notifications)
│   ├── firebase-client.ts             # Firebase Client
│   ├── database.types.ts              # Supabase generated types
│   ├── utils.ts                       # cn() and other helpers
│   ├── logger.ts                      # Structured logging
│   ├── cache.ts                       # Caching helpers
│   ├── rate-limit.ts                  # Rate limiting
│   ├── badges.ts                      # Badge/achievement logic
│   └── sentry.ts                      # Sentry helpers
├── hooks/                             # Shared React hooks
│   └── use-fcm-notifications.ts       # Firebase Cloud Messaging hook
├── public/                            # Static assets
│   ├── manifest.webmanifest            # PWA manifest
│   └── sw.js                          # Service worker
├── supabase/                          # Supabase local config & migrations
│   ├── config.toml                    # Supabase CLI config
│   └── migrations/                    # SQL migrations for schema setup
├── migrations/                        # Standalone SQL migration files
├── scripts/                           # Utility scripts
│   ├── setup-demo-accounts.ts
│   ├── verify-15-day-warning.ts
│   ├── verify-21-day-blocking.ts
│   ├── backup-supabase.sh
│   └── ...other automation scripts
├── vercel.json                        # Vercel deployment config (cron jobs)
├── next.config.mjs                    # Next.js configuration
├── tailwind.config.js                 # Tailwind CSS configuration
├── sentry.client.config.ts            # Sentry client config
├── sentry.server.config.ts            # Sentry server config
├── sentry.edge.config.ts              # Sentry Edge config
├── tsconfig.json                      # TypeScript configuration
├── package.json
└── docs/                              # Project documentation
    ├── Architecture.md
    ├── PRODUCTION_DEPLOYMENT_GUIDE.md
    ├── PRODUCTION_ENVIRONMENT_CHECKLIST.md
    └── ...
```

---

## 10. Database Schema (MVP)

### 10.1 Core Tables

```sql
-- ========================================
-- USERS & PROFILES
-- ========================================

-- User Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('business', 'worker', 'admin')),
  avatar_url TEXT,
  is_verified BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Business Profiles
CREATE TABLE business_profiles (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL,
  business_type TEXT CHECK (business_type IN ('hotel', 'restaurant', 'villa', 'event')),
  address TEXT,
  area TEXT CHECK (area IN ('badung', 'denpasar', 'gianyar', 'tabanan', 'other')),
  website_url TEXT,
  description TEXT,
  license_number TEXT,
  verification_status TEXT CHECK (verification_status IN ('pending', 'verified', 'rejected')) DEFAULT 'pending',
  compliance_verified BOOLEAN DEFAULT FALSE,
  rating DECIMAL(2,1) CHECK (rating >= 1 AND rating <= 5) DEFAULT 3.0,
  total_jobs_posted INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Worker Profiles
CREATE TABLE worker_profiles (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  ktp_number TEXT UNIQUE NOT NULL,
  ktp_image_url TEXT,
  selfie_image_url TEXT,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  area TEXT CHECK (area IN ('badung', 'denpasar', 'gianyar', 'tabanan', 'other')),
  experience_years INTEGER DEFAULT 0,
  bio TEXT,
  skills JSONB DEFAULT '[]'::jsonb,
  kyc_status TEXT CHECK (kyc_status IN ('pending', 'verified', 'rejected')) DEFAULT 'pending',
  availability_status TEXT CHECK (availability_status IN ('available', 'busy', 'offline')) DEFAULT 'available',
  hourly_rate DECIMAL(10,2) CHECK (hourly_rate >= 0),
  rating DECIMAL(2,1) CHECK (rating >= 1 AND rating <= 5) DEFAULT 3.0,
  reliability_score DECIMAL(3,2) CHECK (reliability_score >= 1 AND reliability_score <= 5) DEFAULT 3.0,
  total_shifts INTEGER DEFAULT 0,
  total_hours_worked DECIMAL(10,2) DEFAULT 0.0,
  attendance_rate DECIMAL(5,2) DEFAULT 100.0,
  punctuality_rate DECIMAL(5,2) DEFAULT 100.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- JOBS
-- ========================================

CREATE TABLE jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  position_type TEXT NOT NULL CHECK (position_type IN ('housekeeping', 'steward', 'cook', 'kitchen_helper', 'server', 'bartender', 'driver', 'other')),
  description TEXT,
  requirements JSONB DEFAULT '[]'::jsonb,
  date DATE NOT NULL,
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  area TEXT CHECK (area IN ('badung', 'denpasar', 'gianyar', 'tabanan', 'other')),
  address TEXT NOT NULL,
  wage_rate INTEGER NOT NULL CHECK (wage_rate >= 0),
  wage_type TEXT CHECK (wage_type IN ('flat', 'hourly')) DEFAULT 'flat',
  workers_needed INTEGER NOT NULL CHECK (workers_needed >= 1),
  workers_booked INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('draft', 'open', 'filled', 'cancelled', 'completed')) DEFAULT 'draft',
  is_urgent BOOLEAN DEFAULT FALSE,
  is_compliant BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- BOOKINGS
-- ========================================

CREATE TABLE bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES business_profiles(id),
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled', 'completed', 'no_show')) DEFAULT 'pending',
  check_in_time TIMESTAMPTZ,
  check_out_time TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- RELIABILITY & RATINGS
-- ========================================

CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID UNIQUE NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES business_profiles(id),
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment TEXT,
  would_rehire BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE compliance_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES business_profiles(id),
  worker_id UUID NOT NULL REFERENCES worker_profiles(id),
  month INTEGER NOT NULL,
  year INTEGER NOT NULL,
  days_worked INTEGER DEFAULT 0,
  warning_sent BOOLEAN DEFAULT FALSE,
  blocked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(business_id, worker_id, month, year)
);

-- ========================================
-- JOB APPLICATIONS & ASSIGNMENTS
-- ========================================

CREATE TABLE job_applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES business_profiles(id),
  status TEXT CHECK (status IN ('pending', 'accepted', 'rejected', 'cancelled')) DEFAULT 'pending',
  match_score DECIMAL(5,2) CHECK (match_score >= 0 AND match_score <= 100),
  compliance_status BOOLEAN DEFAULT TRUE,
  applied_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(job_id, worker_id)
);

CREATE TABLE job_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  worker_id UUID NOT NULL REFERENCES worker_profiles(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES business_profiles(id),
  status TEXT CHECK (status IN ('ongoing', 'completed', 'disputed')) DEFAULT 'ongoing',
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  hours_worked DECIMAL(10,2) DEFAULT 0.0,
  wage_paid DECIMAL(15,2) DEFAULT 0.0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- WALLETS & PAYMENTS
-- ========================================

CREATE TABLE wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID UNIQUE NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  balance INTEGER DEFAULT 0,
  pending_balance INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES wallets(id),
  type TEXT NOT NULL CHECK (type IN ('deposit', 'withdrawal', 'payment', 'payout', 'fee', 'community_fund')),
  amount INTEGER NOT NULL,
  reference_id TEXT,
  description TEXT,
  status TEXT CHECK (status IN ('pending', 'completed', 'failed', 'cancelled')) DEFAULT 'pending',
  payment_method TEXT,
  external_id TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- COMMUNITY FUND
-- ========================================

CREATE TABLE community_fund (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID REFERENCES jobs(id) ON DELETE SET NULL,
  worker_id UUID REFERENCES worker_profiles(id),
  amount INTEGER NOT NULL,
  contribution_type TEXT CHECK (contribution_type IN ('bpjs_kjk', 'bpjs_jkm', 'insurance')),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- COMMUNITY PLATFORM
-- ========================================

CREATE TABLE community_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category TEXT CHECK (category IN ('tips', 'feedback', 'success_stories', 'qna', 'general')) DEFAULT 'general',
  views INTEGER DEFAULT 0,
  reactions JSONB DEFAULT '{}'::jsonb,
  is_pinned BOOLEAN DEFAULT FALSE,
  is_locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE community_replies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES community_threads(id) ON DELETE CASCADE,
  author_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  reactions JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE community_badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_name TEXT NOT NULL,
  badge_type TEXT CHECK (badge_type IN ('reputation', 'achievement', 'milestone')) DEFAULT 'achievement',
  badge_icon TEXT,
  earned_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, badge_name)
);

CREATE TABLE feature_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  votes INTEGER DEFAULT 0,
  status TEXT CHECK (status IN ('pending', 'under_review', 'planned', 'completed', 'rejected')) DEFAULT 'pending',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- NOTIFICATIONS
-- ========================================

CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('booking_request', 'booking_accepted', 'booking_rejected', 'payment_received', 'withdrawal_processed', 'compliance_warning', 'review_received')),
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  action_url TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ========================================
-- AUDIT & LOGGING
-- ========================================

CREATE TABLE audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  changes JSONB DEFAULT '{}'::jsonb,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('bug', 'feature', 'improvement', 'complaint')),
  content TEXT NOT NULL,
  severity TEXT CHECK (severity IN ('low', 'medium', 'high', 'critical')) DEFAULT 'medium',
  status TEXT CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')) DEFAULT 'open',
  category TEXT CHECK (category IN ('app', 'payment', 'profile', 'job', 'other')) DEFAULT 'app',
  admin_notes TEXT,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 10.2 Indexes

```sql
-- Performance Indexes
CREATE INDEX idx_jobs_business_id ON jobs(business_id);
CREATE INDEX idx_jobs_status_date ON jobs(status, date);
CREATE INDEX idx_jobs_area_date ON jobs(area, date);
CREATE INDEX idx_jobs_is_urgent ON jobs(is_urgent);

CREATE INDEX idx_bookings_job_id ON bookings(job_id);
CREATE INDEX idx_bookings_worker_id ON bookings(worker_id);
CREATE INDEX idx_bookings_status ON bookings(status);

CREATE INDEX idx_job_applications_job_id ON job_applications(job_id);
CREATE INDEX idx_job_applications_worker_id ON job_applications(worker_id);
CREATE INDEX idx_job_applications_status ON job_applications(status);
CREATE INDEX idx_job_applications_match_score ON job_applications(match_score DESC);

CREATE INDEX idx_job_assignments_job_id ON job_assignments(job_id);
CREATE INDEX idx_job_assignments_worker_id ON job_assignments(worker_id);
CREATE INDEX idx_job_assignments_status ON job_assignments(status);

CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);

CREATE INDEX idx_worker_profiles_area ON worker_profiles(area);
CREATE INDEX idx_worker_profiles_reliability ON worker_profiles(reliability_score DESC);
CREATE INDEX idx_worker_profiles_rating ON worker_profiles(rating DESC);
CREATE INDEX idx_worker_profiles_availability ON worker_profiles(availability_status);
CREATE INDEX idx_worker_profiles_skills ON worker_profiles USING GIN(skills);

CREATE INDEX idx_business_profiles_area ON business_profiles(area);
CREATE INDEX idx_business_profiles_rating ON business_profiles(rating DESC);

CREATE INDEX idx_community_threads_author_id ON community_threads(author_id);
CREATE INDEX idx_community_threads_category ON community_threads(category);
CREATE INDEX idx_community_threads_created_at ON community_threads(created_at DESC);

CREATE INDEX idx_community_replies_thread_id ON community_replies(thread_id);
CREATE INDEX idx_community_replies_author_id ON community_replies(author_id);

CREATE INDEX idx_notifications_user_id_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);

CREATE INDEX idx_feature_requests_status ON feature_requests(status);
CREATE INDEX idx_feature_requests_votes ON feature_requests(votes DESC);

CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at DESC);

CREATE INDEX idx_feedback_user_id ON feedback(user_id);
CREATE INDEX idx_feedback_type ON feedback(type);
CREATE INDEX idx_feedback_status ON feedback(status);
CREATE INDEX idx_feedback_severity ON feedback(severity);
CREATE INDEX idx_feedback_created_at ON feedback(created_at DESC);
```

---

## 11. Data Flow & API Patterns

### 11.1 Authentication Flow

```
┌─────────────┐
│   Client    │
│  (Browser)  │
└──────┬──────┘
       │
       │ 1. Login Request (email/password or Google OAuth)
       ▼
┌─────────────────────────┐
│  Supabase Auth       │
│  - Validate Credentials│
│  - Generate JWT Token  │
└──────┬──────────────────┘
       │
       │ 2. Return JWT + User Data
       ▼
┌─────────────┐
│   Client    │
│  (Store JWT │
│   in Cookie)│
└──────┬──────┘
       │
       │ 3. API Request (with JWT)
       ▼
┌─────────────────────────┐
│  Next.js Middleware    │
│  - Verify JWT          │
│  - Get User Profile    │
└──────┬──────────────────┘
       │
       │ 4. Protected Route Access
       ▼
┌─────────────┐
│ Dashboard  │
│   Page     │
└─────────────┘
```

### 11.2 Job Posting Flow

```
┌─────────────┐
│   Business  │
│   User      │
└──────┬──────┘
       │
       │ 1. Fill Job Form
       ▼
┌─────────────┐
│ Job Form    │
│ Component  │
└──────┬──────┘
       │
       │ 2. Submit (createJob)
       ▼
┌─────────────────────────┐
│  Server Action / API   │
│  - Validate (Zod)      │
│  - Insert into jobs    │
│  - Return job data     │
└──────┬──────────────────┘
       │
       │ 3. Success Notification
       ▼
┌─────────────┐
│  Toast UI   │
│   Success  │
└─────────────┘
```

### 11.3 Booking Flow

```
┌─────────────┐    ┌─────────────┐
│   Worker    │    │  Business   │
└──────┬──────┘    └──────┬──────┘
       │                   │
       │ 1. View Jobs      │ 2. View Applications
       ▼                   ▼
┌─────────────────────────────────┐
│       Marketplace (Local DB)    │
│  (Job Listings, Worker Profiles)│
└─────────────┬─────────────────┘
              │
              │ 3. Apply for Job
              ▼
     ┌────────────────┐
     │ Bookings Table│
     │ (status=pending)│
     └────────┬───────┘
              │
              │ 4. Real-time Notification
              │    (via Supabase Realtime)
              ▼
     ┌────────────────┐
     │ Business sees  │
     │ new applicant │
     └────────┬───────┘
              │
              │ 5. Accept/Reject
              ▼
     ┌────────────────┐
     │ Bookings Table│
     │ (status=accepted│
     │  /rejected)  │
     └────────┬───────┘
              │
              │ 6. Notification to Worker
              ▼
     ┌────────────────┐
     │ Worker sees   │
     │ booking status│
     └────────────────┘
```

### 11.4 Payment Flow (Wallet)

```
┌─────────────┐
│   Business  │
│   User      │
└──────┬──────┘
       │
       │ 1. Top Up Wallet
       ▼
┌─────────────────────────┐
│  Payment Form (QRIS)   │
└──────┬──────────────────┘
       │
       │ 2. Create Payment (Xendit)
       ▼
┌─────────────────────────┐
│  Xendit API            │
│  - Generate QR Code    │
└──────┬──────────────────┘
       │
       │ 3. Display QR Code
       ▼
┌─────────────────────────┐
│   Business User       │
│   (Scan & Pay)        │
└──────┬──────────────────┘
       │
       │ 4. Payment Success
       ▼
┌─────────────────────────┐
│  Xendit Webhook       │
│  → /api/webhooks/xendit│
└──────┬──────────────────┘
       │
       │ 5. Update Wallet Balance
       ▼
┌─────────────────────────┐
│  Wallets Table (Local DB)│
│  (balance += amount)  │
└──────┬──────────────────┘
       │
       │ 6. Create Transaction Record
       ▼
┌─────────────────────────┐
│  Transactions Table    │
│  (type=deposit)       │
└─────────────────────────┘
```

---

## 12. Edge Functions (Supabase Cloud)

### 12.1 Reliability Score Calculation

```typescript
// supabase/functions/reliability-score/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
    );

    const { worker_id } = await req.json();

    // Get completed bookings in last 90 days
    const { data: bookings } = await supabase
      .from("bookings")
      .select("status, check_in_time, check_out_time")
      .eq("worker_id", worker_id)
      .eq("status", "completed")
      .gte(
        "created_at",
        new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      );

    // Calculate metrics
    const totalBookings = bookings.length;
    const onTimeBookings = bookings.filter((b) => {
      const checkIn = new Date(b.check_in_time!);
      const jobStart = new Date(b.check_in_time!);
      const diffMinutes = (checkIn.getTime() - jobStart.getTime()) / 60000;
      return diffMinutes >= -15 && diffMinutes <= 15;
    }).length;

    const attendanceRate =
      totalBookings > 0 ? (totalBookings / totalBookings) * 100 : 100;
    const punctualityRate =
      totalBookings > 0 ? (onTimeBookings / totalBookings) * 100 : 100;

    // Get average rating
    const { data: reviews } = await supabase
      .from("reviews")
      .select("rating")
      .eq("worker_id", worker_id);

    const avgRating =
      reviews.length > 0
        ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
        : 3.0;

    // Calculate reliability score (weighted average)
    const reliabilityScore =
      (attendanceRate * 0.3 + punctualityRate * 0.3 + avgRating * 0.4) / 5;

    // Update worker profile
    await supabase
      .from("worker_profiles")
      .update({
        reliability_score: Math.max(1, Math.min(5, reliabilityScore)),
        total_shifts: totalBookings,
        attendance_rate,
        punctuality_rate,
      })
      .eq("id", worker_id);

    return new Response(
      JSON.stringify({ success: true, reliability_score: reliabilityScore }),
      { headers: { "Content-Type": "application/json" } },
    );
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
```

### 12.2 Compliance Guard (21-Day Limit)

```typescript
// supabase/functions/compliance-guard/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { business_id, worker_id } = await req.json();

    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();

    // Get compliance record for this month
    const { data: record } = await supabase
      .from("compliance_records")
      .select("*")
      .eq("business_id", business_id)
      .eq("worker_id", worker_id)
      .eq("month", month)
      .eq("year", year)
      .single();

    if (!record) {
      // Create new record
      await supabase.from("compliance_records").insert({
        business_id,
        worker_id,
        month,
        year,
        days_worked: 1,
      });
    } else {
      // Increment days worked
      const newDaysWorked = record.days_worked + 1;

      if (newDaysWorked >= 21) {
        // Block this pairing
        await supabase
          .from("compliance_records")
          .update({ blocked: true })
          .eq("id", record.id);

        return new Response(
          JSON.stringify({
            success: false,
            blocked: true,
            message:
              "PP 35/2021: Cannot work more than 21 days/month with same business",
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      } else if (
        newDaysWorked >= 15 &&
        newDaysWorked < 21 &&
        !record.warning_sent
      ) {
        // Send warning at day 15
        await supabase
          .from("compliance_records")
          .update({ warning_sent: true })
          .eq("id", record.id);

        return new Response(
          JSON.stringify({
            success: true,
            warning: true,
            days_worked: newDaysWorked,
            message: `Peringatan: ${21 - newDaysWorked} hari tersisa`,
          }),
          { headers: { "Content-Type": "application/json" } },
        );
      } else {
        // Normal increment
        await supabase
          .from("compliance_records")
          .update({ days_worked: newDaysWorked })
          .eq("id", record.id);
      }
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
```

---

## 13. Security Considerations

### 13.1 Authentication & Authorization

- **JWT-based Auth**: Supabase Auth generates JWT tokens
- **Refresh Tokens**: Automatic token rotation
- **Role-based Access**: `business`, `worker`, `admin` roles
- **RLS Policies**: Database-level access control (PostgreSQL)

### 13.2 Data Protection

- **TLS 1.3**: All data in transit encrypted (automatic via Vercel)
- **AES-256**: Data at rest encrypted (Supabase Cloud PostgreSQL)
- **Environment Variables**: Sensitive data in Vercel environment variables (never committed)
- **Input Validation**: Zod schemas for all inputs
- **Admin API Protection**: `ADMIN_API_SECRET` header required for admin endpoints

### 13.3 Payment Security

- **PCI DSS Compliance**: Via Xendit/Midtrans
- **Webhook Verification**: Verify webhook signatures
- **Rate Limiting**: Prevent brute force attacks (Vercel Edge + Next.js middleware)

---

## 14. Performance Optimization

### 14.1 Frontend

- **Code Splitting**: Route-based code splitting (automatic in Next.js 14)
- **Image Optimization**: Next.js Image component with local storage
- **Lazy Loading**: React.lazy() for heavy components
- **Caching**: React Query with stale-while-revalidate

### 14.2 Backend

- **Database Indexing**: All frequently queried columns indexed
- **Connection Pooling**: Supabase Cloud managed connection pooling
- **Edge Functions**: Server-side logic at edge (Supabase Edge Functions — Deno)
- **Real-time Subscriptions**: Efficient pub/sub (Supabase Realtime)

---

## 15. Monitoring & Observability

| Tool                    | Purpose                | Integration             |
| ---------------------- | ----------------------| ----------------------- |
| **Sentry**             | Error tracking         | Next.js middleware      |
| **PostHog**            | User analytics         | Client-side tracking    |
| **Supabase Dashboard** | Database monitoring    | Built-in (Cloud Studio) |
| **Vercel Logs**        | Serverless function logs | Vercel CLI / Dashboard |
| **Vercel Analytics**  | Performance monitoring | Built-in               |

---

## 16. Vercel CI/CD & Automation

### 16.1 Automatic Deployments

Vercel automatically deploys on every push to connected branches:

| Branch      | Environment | Trigger              |
| ----------- | ----------- | -------------------- |
| `main`      | Production  | Push to `main`       |
| `develop`   | Preview     | Push to `develop`    |
| `feature/*` | Preview     | Push to feature branches |

### 16.2 Promote Preview to Production

```bash
# Merge to main for production deployment
git checkout main
git merge develop
git push origin main

# Or promote a specific preview via Vercel CLI
vercel --prod
```

### 16.3 Rollback

```bash
# List recent deployments
vercel list

# Rollback to a previous deployment
vercel rollback <deployment-url>
```

### 16.4 Post-Deployment Verification

```bash
# scripts/verify-deploy.sh
#!/bin/bash

echo "Verifying deployment..."
DEPLOY_URL="$1"

# Check HTTP status
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$DEPLOY_URL")
if [ "$STATUS" = "200" ]; then
  echo "✓ Site is accessible"
else
  echo "✗ Site returned status $STATUS"
  exit 1
fi

# Check critical API routes
curl -sf "$DEPLOY_URL/api/health" > /dev/null && echo "✓ API health check passed"

echo "Deployment verified successfully!"
```

---

## 17. Cost Analysis (Vercel + Supabase Cloud)

### 17.1 Monthly Costs

| Component                   | Tier         | Monthly Cost |
| -------------------------- | ------------ | ------------ |
| **Vercel Pro**             | Team plan    | $20.00/mo    |
| **Supabase Pro**           | Database + Auth + Storage | ~$25.00/mo |
| **Domain (any registrar)** | Annual / 12  | ~$1.00/mo    |
| **Sentry**                 | Pro plan     | ~$26.00/mo   |
| **Resend**                 | Pay-as-you-go | ~$5.00/mo  |
| **Total**                  |              | **~$77.00/mo** |

### 17.2 Free Tier Estimates

For small teams starting out, the free tiers are sufficient:

| Service       | Free Tier                                    | Cost  |
| ------------- | -------------------------------------------- | ----- |
| **Vercel**    | 100GB bandwidth, serverless functions       | $0    |
| **Supabase**  | 500MB database, 1GB storage, 50k monthly users | $0  |
| **Domain**    | ~$10-15/year                                 | ~$1.25 |
| **Sentry**    | 5k errors/month, 1 user                      | $0    |
| **Resend**    | 100 emails/day                               | $0    |
| **Total**      |                                             | **~$1.25/mo** |

---

**Document Owner:** Sasha (AI Co-founder)
**Last Updated:** March 27, 2026
**Next Review:** After first production deployment
