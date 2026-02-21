# Architecture - Daily Worker Hub Web MVP
**Project:** Daily Worker Hub - Web MVP
**Tech Stack:** Next.js 14 + Supabase Local (Self-Hosted)
**Version:** 1.0
**Last Updated:** February 21, 2026

---

## 1. Deployment Architecture (Self-Hosted)

### 1.1 Infrastructure Overview

```
┌─────────────────────────────────────────────────┐
│                DNS (dailyworkerhub.com)          │
│                    │                            │
│                    ▼                            │
│              ┌───────────────┐                    │
│              │  Hostinger   │                    │
│              │     MCP       │                    │
│              └───────┬───────┘                    │
│                      │                            │
│                      │ A Record                     │
│                      │ dailyworkerhub.com → VPS IP    │
└──────────────────────┬────────────────────────┘
                       │
                       │
        ┌──────────────┴───────────────┐
        │          VPS Server           │
        │    (Ubuntu/DigitalOcean/Contabo) │
        │  - Next.js App (Port 3000)        │
        │  - Supabase Local (Docker)        │
        │    - PostgreSQL (Port 5432)         │
        │    - Studio (Port 8000)            │
        └──────────────┬───────────────┘
                       │
        ┌──────────────┴───────────────┐
        │  Docker Containers (VPS)   │
        │  ┌────────────────────────┐  │
        │  │  Supabase (Docker)    │  │
        │  │  ┌────────────────────┐│  │
        │  │  │  PostgreSQL      ││  │
        │  │  ├────────────────────┤│  │
        │  │  │  GoTrue (Auth)    ││  │
        │  │  ├────────────────────┤│  │
        │  │  │  PostgREST (API)   ││  │
        │  │  ├────────────────────┤│  │
        │  │  │  Realtime (WS)    ││  │
        │  │  ├────────────────────┤│  │
        │  │  │  Storage (S3)     ││  │
        │  │  ├────────────────────┤│  │
        │  │  │  Studio (UI)     ││  │
        │  │  ├────────────────────┤│  │
        │  │  │  Edge Functions   ││  │
        │  │  └────────────────────┘│  │
        │  └────────────────────────┘  │
        └───────────────────────────────┘
```

### 1.2 Components

| Component | Provider | Purpose |
|-----------|----------|---------|
| **VPS Server** | DigitalOcean / Contabo | Host Next.js app and Supabase Local (Docker) |
| **Supabase Local** | Docker (Supabase CLI) | Self-hosted database, auth, storage, edge functions |
| **DNS Provider** | Hostinger MCP | Manage DNS records for dailyworkerhub.com (A record → VPS IP) |
| **Reverse Proxy** | Nginx (VPS) | Route traffic to Next.js (3000) and Supabase Studio (8000) |
| **SSL/TLS** | Let's Encrypt / Certbot | Free SSL for dailyworkerhub.com |

---

## 2. Technology Stack

### 2.1 Frontend

| Technology | Purpose | Version |
|------------|---------|---------|
| **Next.js** | React Framework with App Router | 14.1+ |
| **React** | UI Library | 18.2+ |
| **TypeScript** | Type Safety | 5.3+ |
| **Tailwind CSS** | Styling | 3.4+ |
| **shadcn/ui** | Component Library | Latest |
| **Lucide React** | Icons | Latest |
| **React Hook Form** | Form Management | 7.47+ |
| **Zod** | Schema Validation | 3.22+ |
| **TanStack Query** | Server State Management | 5.17+ |
| **Zustand** | Client State Management | 4.4+ |
| **React Hot Toast** | Notifications | 2.4+ |

### 2.2 Backend & Database (Self-Hosted)

| Technology | Purpose | Version |
|------------|---------|---------|
| **Supabase Local** | Self-hosted backend (Docker) | Latest |
| **PostgreSQL** | Database (managed by Supabase Docker) | 15+ |
| **Supabase Auth** | Authentication (JWT, OAuth) | Built-in |
| **Supabase Realtime** | Real-time subscriptions | Built-in |
| **Supabase Storage** | File Storage (S3-compatible) | Built-in |
| **Supabase Edge Functions** | Serverless Functions | Deno-based |
| **Prisma** | ORM (Optional, for type-safe queries) | 5.8+ |

### 2.3 Infrastructure

| Technology | Purpose | Provider |
|------------|---------|----------|
| **VPS** | Host Next.js + Supabase Local | DigitalOcean (4GB RAM, 2 vCPUs, $24/mo) |
| **Docker** | Containerize Supabase Local | Docker CE |
| **Nginx** | Reverse proxy & SSL termination | Nginx (VPS) |
| **Let's Encrypt** | Free SSL certificates | Certbot |
| **Hostinger MCP** | DNS management | Hostinger (MCP Server) |
| **PM2** | Process Manager | PM2 (VPS) |

---

## 3. Server Setup (VPS)

### 3.1 VPS Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| **CPU** | 2 vCPUs | 4 vCPUs |
| **RAM** | 4 GB | 8 GB |
| **Storage** | 80 GB SSD | 160 GB SSD |
| **Bandwidth** | 4 TB | 5 TB |
| **OS** | Ubuntu 22.04 LTS | Ubuntu 22.04 LTS |

### 3.2 Software Installation (VPS)

```bash
# 1. Update System
sudo apt update && sudo apt upgrade -y

# 2. Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 3. Install Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 4. Install Node.js (via NVM)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash
source ~/.bashrc
nvm install 20
nvm use 20

# 5. Install PM2
sudo npm install -g pm2

# 6. Install Nginx
sudo apt install nginx -y
sudo systemctl start nginx
sudo systemctl enable nginx

# 7. Install Certbot (for SSL)
sudo apt install certbot python3-certbot-nginx -y
```

---

## 4. Supabase Local Setup

### 4.1 Initialize Supabase Local

```bash
# 1. Install Supabase CLI
npm install -g supabase

# 2. Login to Supabase (link to your project)
supabase login

# 3. Start Supabase Local
cd ~/projects
supabase init

# 4. Start Supabase Local (Docker)
supabase start

# 5. Stop Supabase Local
supabase stop

# 6. Reset Supabase Local (drop all data)
supabase db reset
```

### 4.2 Supabase Local Services (Docker)

| Service | Port | Internal Access |
|---------|------|-----------------|
| **Studio UI** | 8000 | http://localhost:8000 (via Docker port forwarding) |
| **PostgreSQL** | 5432 | localhost:5432 (via Docker) |
| **API (REST)** | 3000 | localhost:3000 (via Docker) |
| **Auth** | 9999 | localhost:9999 (via Docker) |
| **Realtime** | 4000 | localhost:4000 (via Docker) |
| **Storage** | 5000 | localhost:5000 (via Docker) |

---

## 5. Next.js App Setup (VPS)

### 5.1 Project Initialization

```bash
# 1. Clone Repository
git clone https://github.com/daws11/daily-worker-hub.git
cd daily-worker-hub

# 2. Install Dependencies
npm install

# 3. Configure Environment Variables
cp .env.example .env.local

# Edit .env.local with VPS details
nano .env.local
```

### 5.2 Environment Variables (VPS)

```env
# ========================================
# SUPABASE LOCAL CONFIGURATION
# ========================================
NEXT_PUBLIC_SUPABASE_URL=http://[VPS-IP]:8000
NEXT_PUBLIC_SUPABASE_ANON_KEY=[Get from Supabase Studio → Settings → API]
SUPABASE_SERVICE_ROLE_KEY=[Get from Supabase Studio → Settings → API]

# ========================================
# APP CONFIGURATION
# ========================================
NEXT_PUBLIC_APP_URL=https://dailyworkerhub.com
NEXT_PUBLIC_APP_NAME=Daily Worker Hub

# ========================================
# NEXTAUTH CONFIGURATION
# ========================================
NEXTAUTH_SECRET=[Generate with: openssl rand -base64 32]
NEXTAUTH_URL=https://dailyworkerhub.com/api/auth

# ========================================
# PAYMENT GATEWAY (XENDIT/MIDTRANS)
# ========================================
XENDIT_SECRET_KEY=[Get from Xendit Dashboard]
XENDIT_PUBLIC_KEY=[Get from Xendit Dashboard]
MIDTRANS_SECRET_KEY=[Get from Midtrans Dashboard]
MIDTRANS_PUBLIC_KEY=[Get from Midtrans Dashboard]

# ========================================
# KYC PROVIDER (VERIHUBS/VIDA)
# ========================================
VERIHUBS_API_KEY=[Get from Verihubs Dashboard]
VIDA_API_KEY=[Get from Vida Dashboard]

# ========================================
# EMAIL/OTP (TWILIO)
# ========================================
TWILIO_ACCOUNT_SID=[Get from Twilio Dashboard]
TWILIO_AUTH_TOKEN=[Get from Twilio Dashboard]

# ========================================
# ERROR TRACKING (SENTRY)
# ========================================
NEXT_PUBLIC_SENTRY_DSN=[Get from Sentry Dashboard]

# ========================================
# ANALYTICS (POSTHOG)
# ========================================
NEXT_PUBLIC_POSTHOG_KEY=[Get from PostHog Dashboard]
NEXT_PUBLIC_POSTHOG_HOST=https://app.posthog.com
```

### 5.3 Build & Start Next.js

```bash
# 1. Build Production Bundle
npm run build

# 2. Start Next.js with PM2 (Production)
pm2 start npm --name "daily-worker-hub" -- start

# 3. Save PM2 Process List
pm2 save

# 4. Start PM2 on Boot
pm2 startup
```

---

## 6. Hostinger MCP Setup (DNS Management)

### 6.1 Configure Hostinger MCP

**Goal:** Set up DNS records for `dailyworkerhub.com` to point to VPS IP.

**Steps:**

1. **Connect to Hostinger MCP Server**
   - Use MCP client to connect to Hostinger API
   - Authenticate with Hostinger credentials

2. **Add Domain to Hostinger**
   - If domain is registered elsewhere, update nameservers to Hostinger
   - If domain is registered with Hostinger, skip to step 3

3. **Configure DNS Records**
   - Create **A Record**:
     - **Name:** `@` (root) or `www`
     - **Type:** `A`
     - **Value:** `[VPS-IP]` (e.g., `161.35.123.456`)
     - **TTL:** `3600` (1 hour)

4. **Verify DNS Propagation**
   - Use `dig dailyworkerhub.com` to check if A record points to VPS IP
   - Wait 15-30 minutes for global propagation

### 6.2 MCP Function Example

```typescript
// lib/mcp/hostinger-dns.ts
export interface UpdateDnsParams {
  domain: string
  type: 'A' | 'CNAME'
  name: string
  value: string
  ttl: number
}

export async function updateDnsRecord(params: UpdateDnsParams) {
  // Call Hostinger MCP API
  const response = await fetch('https://api.hostinger.com/v1/dns/records', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.HOSTINGER_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(params),
  })

  return response.json()
}

// Example Usage
await updateDnsRecord({
  domain: 'dailyworkerhub.com',
  type: 'A',
  name: '@',
  value: '161.35.123.456',
  ttl: 3600,
})
```

---

## 7. Nginx Configuration (VPS)

### 7.1 Reverse Proxy Setup

**File:** `/etc/nginx/sites-available/dailyworkerhub`

```nginx
# ========================================
# HTTP → HTTPS Redirect
# ========================================
server {
    listen 80;
    server_name dailyworkerhub.com www.dailyworkerhub.com;
    return 301 https://$host$request_uri;
}

# ========================================
# HTTPS Configuration
# ========================================
server {
    listen 443 ssl http2;
    server_name dailyworkerhub.com www.dailyworkerhub.com;

    # SSL Certificate (Let's Encrypt)
    ssl_certificate /etc/letsencrypt/live/dailyworkerhub.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/dailyworkerhub.com/privkey.pem;

    # Security Headers
    add_header X-Frame-Options "SAMEORIGIN";
    add_header X-Content-Type-Options "nosniff";
    add_header X-XSS-Protection "1; mode=block";

    # ========================================
    # Next.js App (Port 3000)
    # ========================================
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # ========================================
    # Supabase Studio (Port 8000)
    # ========================================
    location /studio {
        proxy_pass http://localhost:8000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # Optional: Basic Auth for Studio
        # auth_basic "Supabase Studio";
        # auth_basic_user_file /etc/nginx/.htpasswd;
    }

    # ========================================
    # Supabase API (Port 3000 - Docker)
    # ========================================
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 7.2 Enable Nginx Configuration

```bash
# 1. Create symbolic link
sudo ln -s /etc/nginx/sites-available/dailyworkerhub /etc/nginx/sites-enabled/

# 2. Test Nginx Configuration
sudo nginx -t

# 3. Reload Nginx
sudo systemctl reload nginx
```

---

## 8. SSL/TLS Setup (Let's Encrypt)

### 8.1 Obtain SSL Certificate

```bash
# 1. Install Certbot (if not already installed)
sudo apt install certbot python3-certbot-nginx -y

# 2. Obtain SSL Certificate
sudo certbot --nginx -d dailyworkerhub.com -d www.dailyworkerhub.com

# 3. Auto-renew SSL (Cron Job)
sudo crontab -e

# Add this line to crontab (renews SSL daily at 2:30 AM)
30 2 * * * /usr/bin/certbot renew --quiet
```

---

## 9. Project Structure

### 9.1 Monorepo Structure

```
daily-worker-hub/
├── apps/                          # Next.js Apps
│   ├── web/                       # Main Web Application
│   │   ├── app/                   # App Router (Next.js 14)
│   │   │   ├── (auth)/            # Auth Layout
│   │   │   │   ├── login/
│   │   │   │   ├── register/
│   │   │   │   └── layout.tsx
│   │   │   ├── (dashboard)/        # Dashboard Layout
│   │   │   │   ├── business/      # Business Portal
│   │   │   │   │   ├── jobs/      # Job Management
│   │   │   │   │   ├── bookings/ # Booking Management
│   │   │   │   │   ├── wallet/    # Wallet Management
│   │   │   │   │   └── reports/   # Reports & Compliance
│   │   │   │   └── worker/       # Worker Portal
│   │   │   │       ├── jobs/      # Job Discovery
│   │   │   │       ├── bookings/ # My Bookings
│   │   │   │       ├── wallet/    # Earnings & Withdraw
│   │   │   │       └── profile/   # Profile & Ratings
│   │   │   ├── (marketplace)/      # Public Marketplace
│   │   │   │   ├── jobs/          # Job Listings
│   │   │   │   └── workers/      # Worker Profiles
│   │   │   ├── api/               # API Routes (if needed)
│   │   │   │   └── webhooks/      # Payment Webhooks
│   │   │   ├── layout.tsx          # Root Layout
│   │   │   ├── page.tsx            # Landing Page
│   │   │   └── globals.css        # Global Styles
│   │   ├── components/            # Shared Components
│   │   │   ├── ui/                # shadcn/ui Components
│   │   │   ├── layout/             # Layout Components
│   │   │   ├── business/           # Business-Specific Components
│   │   │   ├── worker/            # Worker-Specific Components
│   │   │   └── shared/            # Shared Components
│   │   ├── lib/                   # Utilities & Helpers
│   │   │   ├── supabase/          # Supabase Client
│   │   │   ├── api/               # API Wrappers
│   │   │   ├── hooks/             # Custom React Hooks
│   │   │   ├── schemas/            # Zod Schemas
│   │   │   └── types/             # TypeScript Types
│   │   ├── styles/                # CSS Files
│   │   ├── public/                # Static Assets
│   │   ├── middleware.ts          # Middleware (Auth, etc)
│   │   ├── next.config.mjs         # Next.js Config
│   │   ├── tailwind.config.ts     # Tailwind Config
│   │   ├── tsconfig.json          # TypeScript Config
│   │   └── package.json
├── supabase/                       # Supabase Configuration (Local)
│   ├── migrations/                 # Database Migrations
│   ├── functions/                  # Edge Functions (Local Docker)
│   └── seed-data/                  # Seed Data for Development
├── scripts/                        # Deployment Scripts
│   ├── deploy.sh                   # Deploy to VPS script
│   ├── start-supabase.sh           # Start Supabase Local script
│   └── setup-dns.sh                # Setup Hostinger DNS script
└── docs/                           # Documentation
    ├── architecture.md
    ├── deployment.md
    └── mcp-setup.md
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
  reliability_score DECIMAL(3,2) CHECK (reliability_score >= 1 AND reliability_score <= 5) DEFAULT 3.0,
  total_shifts INTEGER DEFAULT 0,
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
```

### 10.2 Indexes

```sql
-- Performance Indexes
CREATE INDEX idx_jobs_business_id ON jobs(business_id);
CREATE INDEX idx_jobs_status_date ON jobs(status, date);
CREATE INDEX idx_jobs_area_date ON jobs(area, date);

CREATE INDEX idx_bookings_job_id ON bookings(job_id);
CREATE INDEX idx_bookings_worker_id ON bookings(worker_id);
CREATE INDEX idx_bookings_status ON bookings(status);

CREATE INDEX idx_wallets_user_id ON wallets(user_id);
CREATE INDEX idx_transactions_wallet_id ON transactions(wallet_id);
CREATE INDEX idx_transactions_created_at ON transactions(created_at DESC);

CREATE INDEX idx_worker_profiles_area ON worker_profiles(area);
CREATE INDEX idx_worker_profiles_reliability ON worker_profiles(reliability_score DESC);
CREATE INDEX idx_worker_profiles_skills ON worker_profiles USING GIN(skills);

CREATE INDEX idx_notifications_user_id_read ON notifications(user_id, is_read);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
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
│  Supabase Local Auth  │
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

## 12. Edge Functions (Supabase Local)

### 12.1 Reliability Score Calculation

```typescript
// supabase/functions/reliability-score/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? ''
    )

    const { worker_id } = await req.json()

    // Get completed bookings in last 90 days
    const { data: bookings } = await supabase
      .from('bookings')
      .select('status, check_in_time, check_out_time')
      .eq('worker_id', worker_id)
      .eq('status', 'completed')
      .gte('created_at', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString())

    // Calculate metrics
    const totalBookings = bookings.length
    const onTimeBookings = bookings.filter(b => {
      const checkIn = new Date(b.check_in_time!)
      const jobStart = new Date(b.check_in_time!) 
      const diffMinutes = (checkIn.getTime() - jobStart.getTime()) / 60000
      return diffMinutes >= -15 && diffMinutes <= 15
    }).length

    const attendanceRate = (totalBookings > 0) ? (totalBookings / totalBookings) * 100 : 100
    const punctualityRate = (totalBookings > 0) ? (onTimeBookings / totalBookings) * 100 : 100

    // Get average rating
    const { data: reviews } = await supabase
      .from('reviews')
      .select('rating')
      .eq('worker_id', worker_id)

    const avgRating = reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : 3.0

    // Calculate reliability score (weighted average)
    const reliabilityScore = (
      (attendanceRate * 0.3) +
      (punctualityRate * 0.3) +
      (avgRating * 0.4)
    ) / 5

    // Update worker profile
    await supabase
      .from('worker_profiles')
      .update({
        reliability_score: Math.max(1, Math.min(5, reliabilityScore)),
        total_shifts: totalBookings,
        attendance_rate,
        punctuality_rate
      })
      .eq('id', worker_id)

    return new Response(
      JSON.stringify({ success: true, reliability_score: reliabilityScore }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

### 12.2 Compliance Guard (21-Day Limit)

```typescript
// supabase/functions/compliance-guard/index.ts
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

serve(async (req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { business_id, worker_id } = await req.json()

    const now = new Date()
    const month = now.getMonth() + 1
    const year = now.getFullYear()

    // Get compliance record for this month
    const { data: record } = await supabase
      .from('compliance_records')
      .select('*')
      .eq('business_id', business_id)
      .eq('worker_id', worker_id)
      .eq('month', month)
      .eq('year', year)
      .single()

    if (!record) {
      // Create new record
      await supabase.from('compliance_records').insert({
        business_id,
        worker_id,
        month,
        year,
        days_worked: 1
      })
    } else {
      // Increment days worked
      const newDaysWorked = record.days_worked + 1

      if (newDaysWorked >= 21) {
        // Block this pairing
        await supabase
          .from('compliance_records')
          .update({ blocked: true })
          .eq('id', record.id)

        return new Response(
          JSON.stringify({ 
            success: false, 
            blocked: true,
            message: 'PP 35/2021: Cannot work more than 21 days/month with same business'
          }),
          { headers: { 'Content-Type': 'application/json' } }
        )
      } else if (newDaysWorked >= 15 && newDaysWorked < 21 && !record.warning_sent) {
        // Send warning at day 15
        await supabase
          .from('compliance_records')
          .update({ warning_sent: true })
          .eq('id', record.id)

        return new Response(
          JSON.stringify({ 
            success: true, 
            warning: true,
            days_worked: newDaysWorked,
            message: `Peringatan: ${21 - newDaysWorked} hari tersisa`
          }),
          { headers: { 'Content-Type': 'application/json' } }
        )
      } else {
        // Normal increment
        await supabase
          .from('compliance_records')
          .update({ days_worked: newDaysWorked })
          .eq('id', record.id)
      }
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

---

## 13. Security Considerations

### 13.1 Authentication & Authorization

- **JWT-based Auth**: Supabase Local Auth generates JWT tokens
- **Refresh Tokens**: Automatic token rotation
- **Role-based Access**: `business`, `worker`, `admin` roles
- **RLS Policies**: Database-level access control (PostgreSQL)

### 13.2 Data Protection

- **TLS 1.3**: All data in transit encrypted (Nginx + Let's Encrypt)
- **AES-256**: Data at rest encrypted (PostgreSQL)
- **Environment Variables**: Sensitive data in `.env.local` (never committed)
- **Input Validation**: Zod schemas for all inputs
- **VPN Access**: Only access VPS via VPN (for co-founder safety)

### 13.3 Payment Security

- **PCI DSS Compliance**: Via Xendit/Midtrans
- **Webhook Verification**: Verify webhook signatures
- **Rate Limiting**: Prevent brute force attacks (Nginx or Next.js middleware)

---

## 14. Performance Optimization

### 14.1 Frontend

- **Code Splitting**: Route-based code splitting (automatic in Next.js 14)
- **Image Optimization**: Next.js Image component with local storage
- **Lazy Loading**: React.lazy() for heavy components
- **Caching**: React Query with stale-while-revalidate

### 14.2 Backend

- **Database Indexing**: All frequently queried columns indexed
- **Connection Pooling**: Supabase managed connection pooling (Docker)
- **Edge Functions**: Server-side logic at edge (Deno in Docker)
- **Real-time Subscriptions**: Efficient pub/sub (Supabase Realtime)

---

## 15. Monitoring & Observability

| Tool | Purpose | Integration |
|------|---------|-------------|
| **Sentry** | Error tracking | Next.js middleware |
| **PostHog** | User analytics | Client-side tracking |
| **Supabase Dashboard** | Database monitoring | Built-in (Local Studio) |
| **Nginx Access Logs** | Web server monitoring | Built-in (VPS logs) |
| **PM2** | Process monitoring | Built-in (VPS logs) |
| **Docker Logs** | Container monitoring | Docker logs |

---

## 16. Deployment Scripts

### 16.1 Start Supabase Local

```bash
#!/bin/bash
# scripts/start-supabase.sh

echo "Starting Supabase Local..."
cd ~/projects/supabase
supabase start

echo "Supabase Local started!"
echo "Studio: http://localhost:8000"
echo "API: http://localhost:3000"
```

### 16.2 Deploy Next.js to VPS

```bash
#!/bin/bash
# scripts/deploy.sh

echo "Pulling latest code..."
git pull origin main

echo "Installing dependencies..."
npm install

echo "Building production bundle..."
npm run build

echo "Starting Next.js with PM2..."
pm2 stop daily-worker-hub
pm2 start npm --name "daily-worker-hub" -- start

echo "Deployment completed!"
echo "App URL: https://dailyworkerhub.com"
```

### 16.3 Setup Hostinger DNS (MCP)

```bash
#!/bin/bash
# scripts/setup-dns.sh

echo "Updating Hostinger DNS records..."
# Call MCP function to update A record
./scripts/update-dns-record.sh dailyworkerhub.com A @ [VPS-IP]

echo "DNS updated! Waiting for propagation..."
sleep 30

echo "Testing DNS..."
dig dailyworkerhub.com

echo "DNS setup completed!"
```

---

## 17. Cost Analysis (Self-Hosted)

| Component | Monthly Cost | Annual Cost |
|-----------|--------------|-------------|
| **VPS (DigitalOcean 4GB)** | $24.00 | $288.00 |
| **Domain (Hostinger)** | ~$10.00 | ~$120.00 |
| **SSL (Let's Encrypt)** | $0.00 | $0.00 |
| **Total** | **~$34.00** | **~$408.00** |

**Savings vs Supabase Cloud:** Self-hosting saves ~$25-50/month compared to Pro plan, plus gives full control.

---

**Document Owner:** Sasha (AI Co-founder)
**Last Review:** February 21, 2026
**Next Review:** After VPS Deployment
