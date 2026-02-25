# Social Platform Integration Setup Guide - Daily Worker Hub

Panduan lengkap untuk mengintegrasikan Instagram dan Facebook dengan Daily Worker Hub, memungkinkan distribusi otomatis job posting ke platform media sosial.

## 📋 Prerequisites Checklist

Sebelum memulai integration, pastikan sudah menyiapkan:

### 1. Facebook Developer Account
- [ ] Buat Facebook Developer account di https://developers.facebook.com
- [ ] Verify email dan phone number
- [ ] Catat App ID dan App Secret setelah membuat app

### 2. Instagram Business Account
- [ ] Convert Instagram account ke Business/Creator account
- [ ] Connect Instagram account ke Facebook Page
- [ ] Pastikan Instagram Business account sudah verified

### 3. Facebook Page
- [ ] Buat Facebook Page untuk business
- [ ] Catat Page ID (dari Page Settings > About > Page ID)
- [ ] Pastikan memiliki admin access ke page

### 4. Supabase Project
- [ ] Supabase project sudah running
- [ ] Database migrations sudah diaplikasikan
- [ ] Edge functions sudah deployed

---

## 🔧 Facebook Developer Portal Setup

### 1. Create New App

1. Go to https://developers.facebook.com/apps
2. Click **Add New App**
3. Select **Business** type
4. Fill in app details:
   - **App Display Name**: Daily Worker Hub - [Your Environment]
   - **App Contact Email**: Your email
5. Click **Create App**

### 2. Configure Instagram Basic Display

1. In App Dashboard, find **Instagram Basic Display** in left sidebar
2. Click **Set Up** or **Add Product**
3. In **Instagram Basic Display** settings:
   - **Valid OAuth Redirect URIs**:
     ```
     https://your-domain.com/api/auth/social/callback
     http://localhost:3000/api/auth/social/callback  # For local development
     ```
   - Click **Save Changes**

4. Generate **Instagram App Secret**:
   - Go to **Settings** > **Basic**
   - Find **App Secret** section
   - Click **Show** and then copy the secret
   - ⚠️ **Simpan App Secret dengan aman - akan diperlukan untuk environment variables**

5. Copy **App ID** from **Settings** > **Basic**

### 3. Configure Facebook Graph API

1. In App Dashboard, find **Facebook Login** in left sidebar
2. Click **Set Up** or **Add Product**
3. In **Facebook Login** settings:
   - **Valid OAuth Redirect URIs**:
     ```
     https://your-domain.com/api/auth/social/callback
     http://localhost:3000/api/auth/social/callback  # For local development
     ```
   - Enable **Client OAuth Login**
   - Enable **Web OAuth Login**
   - Click **Save Changes**

4. Add **Pages Permission**:
   - Go to **App Review** > **Permissions and Features**
   - Request and add these permissions:
     - `pages_read_engagement` - Read engagement data from pages
     - `pages_manage_posts` - Manage posts on behalf of pages
     - `pages_read_user_content` - Read user content from pages
   - Submit for review (required for production)

5. Get **Page Access Token**:
   - Go to **Tools & Tests** > **Graph API Explorer**
   - Select your app from dropdown
   - Select **Get Page Access Token** from dropdown
   - Select your Facebook Page
   - Click **Generate Access Token**
   - Review permissions requested and grant access
   - Copy the generated Page Access Token

---

## 🔧 Environment Configuration

### 1. Update Environment Variables

Edit file `.env.local` di root project:

```bash
# ============================================================================
# Social Media Platform Configuration
# ============================================================================

# Instagram Basic Display API credentials
# Get from: Facebook Developer Portal > My Apps > Instagram Basic Display
INSTAGRAM_APP_ID=your-instagram-app-id-here
INSTAGRAM_APP_SECRET=your-instagram-app-secret-here
INSTAGRAM_REDIRECT_URI=https://your-domain.com/api/auth/social/callback

# Facebook Graph API credentials
# Get from: Facebook Developer Portal > My Apps > Facebook Login
FACEBOOK_APP_ID=your-facebook-app-id-here
FACEBOOK_APP_SECRET=your-facebook-app-secret-here
FACEBOOK_PAGE_ID=your-facebook-page-id-here

# Webhook signature verification
# Optional: Generate a random secret for webhook verification
SOCIAL_WEBHOOK_SECRET=generate-random-secret-here
```

**Notes:**
- Untuk local development, gunakan `http://localhost:3000` untuk redirect URI
- `INSTAGRAM_APP_ID` dan `FACEBOOK_APP_ID` bisa sama jika menggunakan satu Facebook app
- `FACEBOOK_PAGE_ID` format numerik (contoh: `123456789012345`)
- `SOCIAL_WEBHOOK_SECRET` gunakan string random minimal 32 karakter

### 2. Restart Development Server

Setelah mengubah environment variables:

```bash
# Stop development server (Ctrl+C)
# Start ulang dengan konfigurasi baru
npm run dev
```

---

## 🔄 OAuth Flow Explanation

### Connection Flow

1. **User Initiates Connection**
   - Business user clicks "Connect Instagram" or "Connect Facebook" button
   - Frontend calls `GET /functions/v1/social-connect?platform=instagram|facebook`
   - Edge function returns OAuth authorization URL

2. **User Authorizes App**
   - User di-redirect ke Facebook/Instagram OAuth page
   - User grants requested permissions
   - User di-redirect kembali ke callback URL dengan authorization code

3. **Token Exchange**
   - Frontend sends authorization code ke `POST /functions/v1/social-connect`
   - Edge function exchanges code untuk access token
   - Access token disimpan di `business_social_connections` table

4. **Auto-Posting**
   - Saat job dibuat, database trigger membuat entries di `job_posts` table
   - `social-distribute` edge function dipanggil untuk posting ke semua platform
   - Setiap platform-specific edge function (`social-instagram`, `social-facebook`) melakukan posting
   - Post status dan metrics di-update di `job_posts` table

### Required OAuth Scopes

**Instagram:**
```
instagram_basic              - Profile access
instagram_content_publish    - Post content
pages_read_engagement        - Read page engagement
pages_manage_posts          - Manage page posts
```

**Facebook:**
```
pages_read_engagement        - Read page engagement
pages_manage_posts          - Manage page posts
pages_read_user_content     - Read page content
```

---

## 🗄️ Database Schema

Social platform integration menggunakan 3 tables:

### 1. social_platforms
Menyimpan konfigurasi untuk setiap platform type:

```sql
CREATE TABLE social_platforms (
  id UUID PRIMARY KEY,
  platform_type TEXT NOT NULL,
  platform_name TEXT NOT NULL,
  api_version TEXT,
  oauth_scopes TEXT[],
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 2. business_social_connections
Menyimpan koneksi antara business dan social platform:

```sql
CREATE TABLE business_social_connections (
  id UUID PRIMARY KEY,
  business_id UUID REFERENCES businesses(id),
  platform_id UUID REFERENCES social_platforms(id),
  account_id TEXT NOT NULL,           -- Instagram/Facebook account ID
  account_name TEXT,                  -- Display name
  access_token TEXT NOT NULL,         -- OAuth access token
  refresh_token TEXT,                 -- Refresh token (jika applicable)
  token_expires_at TIMESTAMPTZ,       -- Token expiration
  status TEXT DEFAULT 'active',       -- active, revoked, error
  last_used_at TIMESTAMPTZ,
  error_count INTEGER DEFAULT 0,
  settings JSONB,                     -- Platform-specific settings
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### 3. job_posts
Menyimpan track setiap social media post untuk setiap job:

```sql
CREATE TABLE job_posts (
  id UUID PRIMARY KEY,
  job_id UUID REFERENCES jobs(id),
  connection_id UUID REFERENCES business_social_connections(id),
  platform_type TEXT NOT NULL,
  status TEXT DEFAULT 'pending',      -- pending, posting, posted, failed
  platform_post_id TEXT,              -- ID dari post di Instagram/Facebook
  platform_post_url TEXT,
  content JSONB,                      -- Posted content
  metrics JSONB,                      -- Views, likes, comments, etc.
  posted_at TIMESTAMPTZ,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## 🧪 Testing Integration

### 1. Test OAuth Connection

```bash
# Navigate ke project root
cd daily-worker-hub

# Start development server
npm run dev

# Open browser ke business social settings page
# http://localhost:3000/business/settings/social
```

Steps:
1. Login sebagai business user
2. Go to Settings > Social Platforms
3. Click "Connect Instagram" atau "Connect Facebook"
4. Authorize app di OAuth popup
5. Verify connection muncul di list dengan status "active"

### 2. Test Job Distribution

```bash
# Create test job via UI atau menggunakan test script
node scripts/test-social-distribution.ts
```

Expected results:
- `job_posts` table terbuat entries untuk setiap connected platform
- Status changes: `pending` → `posting` → `posted`
- `platform_post_id` dan `platform_post_url` terisi
- No error messages

### 3. Verify Social Media Posts

**Instagram:**
- Check Instagram Business account
- Verify post muncul dengan caption dan hashtags
- Note post ID untuk cross-reference

**Facebook:**
- Check Facebook Page
- Verify post muncul di page feed
- Check link ke job posting

---

## 🔍 Troubleshooting

### OAuth Issues

**Problem: "Invalid OAuth redirect URI"**
```
Solution:
1. Pastikan redirect URI di Facebook Developer Portal sama persis dengan yang di .env.local
2. Termasuk protocol (http vs https) dan port number
3. Untuk local development, gunakan: http://localhost:3000/api/auth/social/callback
```

**Problem: "Access token expired"**
```
Solution:
1. Tokens expire setelah 60 hari
2. System otomatis detect expired tokens via token_expires_at column
3. User perlu reconnect account (status akan berubah ke 'revoked')
4. Consider implementing auto-refresh untuk long-lived access tokens
```

### API Issues

**Problem: "Permission denied"**
```
Solution:
1. Pastikan semua permissions sudah diapprove di App Review
2. Untuk development, gunakan Test Mode di app settings
3. Tambah tester accounts di App Dashboard > Roles > Testers
4. Pastikan Page Access Token includes required permissions
```

**Problem: "Page not found"**
```
Solution:
1. Verify FACEBOOK_PAGE_ID correct di .env.local
2. Pastikan Instagram account connected ke Facebook Page yang benar
3. Check page access permissions via Graph API Explorer
```

### Posting Issues

**Problem: "Job post not created on social platform"**
```
Solution:
1. Check job_posts table untuk error_message
2. Verify business_social_connections status = 'active'
3. Check edge function logs di Supabase Dashboard > Functions
4. Verify access token masih valid via Graph API Explorer
```

**Problem: "Auto-distribution not working"**
```
Solution:
1. Check database trigger exists: trigger_auto_distribute_job
2. Verify job platform_settings includes platform
3. Check job_posts table entries created after job insert
4. Manually call: SELECT manually_distribute_job(job_id)
```

### Webhook Issues

**Problem: "Webhook signature verification failed"**
```
Solution:
1. Pastikan SOCIAL_WEBHOOK_SECRET sama di .env.local dan webhook config
2. Verify signature header name (X-Hub-Signature-256)
3. Check webhook secret registered di database social_platforms table
```

---

## 📊 Monitoring & Analytics

### Track Post Performance

Post performance dapat di-view di:

1. **Business Analytics Page**
   - URL: `/business/analytics`
   - Shows: total posts, views, engagement, engagement rate
   - Breakdown by platform

2. **Job Detail Page**
   - Shows individual post status for each job
   - Displays metrics: likes, comments, shares, views
   - Links ke actual social media posts

3. **Database Queries**
```sql
-- Get all posts with metrics
SELECT
  jp.id,
  j.title,
  jp.platform_type,
  jp.status,
  jp.metrics->>'views' as views,
  jp.metrics->>'likes' as likes,
  jp.metrics->>'comments' as comments,
  jp.created_at
FROM job_posts jp
JOIN jobs j ON j.id = jp.job_id
WHERE jp.business_id = '[business-id]'
ORDER BY jp.created_at DESC;

-- Get engagement by platform
SELECT
  platform_type,
  COUNT(*) as total_posts,
  AVG((metrics->>'views')::int) as avg_views,
  AVG((metrics->>'likes')::int) as avg_likes,
  AVG((metrics->>'comments')::int) as avg_comments
FROM job_posts
WHERE status = 'posted'
GROUP BY platform_type;
```

---

## 🚀 Deployment Checklist

### Production Deployment

- [ ] Facebook app di-set ke **Live Mode** (bukan Development Mode)
- [ ] Semua permissions approved via **App Review**
- [ ] Environment variables di-set di production environment
- [ ] Redirect URI di-update ke production domain
- [ ] SSL certificate valid (required untuk OAuth)
- [ ] Webhook endpoints accessible dari internet
- [ ] Database migrations applied di production
- [ ] Edge functions deployed ke production Supabase project
- [ ] Test connection flow dengan production credentials

### Post-Deployment

- [ ] Connect business account ke Instagram/Facebook
- [ ] Create test job dan verify distribution
- [ ] Check analytics dashboard untuk metrics
- [ ] Monitor error logs di Supabase Dashboard
- [ ] Verify webhook callbacks functioning

---

## 📝 Additional Resources

- [Facebook Graph API Documentation](https://developers.facebook.com/docs/graph-api)
- [Instagram Basic Display API](https://developers.facebook.com/docs/instagram-basic-display-api)
- [Instagram Graph API](https://developers.facebook.com/docs/instagram-api)
- [Facebook Login OAuth](https://developers.facebook.com/docs/facebook-login/oauth)

---

*Dokumentasi ini akan terus di-update seiring perkembangan fitur social platform integration.*
