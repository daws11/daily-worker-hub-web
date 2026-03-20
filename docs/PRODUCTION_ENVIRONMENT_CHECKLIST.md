# Production Environment Checklist

Complete guide for configuring Daily Worker Hub for production deployment.

## 📋 Pre-Deployment Checklist

### ✅ Core Infrastructure

- [ ] **Supabase Production Project**
  - Create production project at supabase.com
  - Update `NEXT_PUBLIC_SUPABASE_URL` to production URL
  - Update `NEXT_PUBLIC_SUPABASE_ANON_KEY` to production anon key
  - Update `SUPABASE_SERVICE_ROLE_KEY` to production service role key
  - Run all migrations: `supabase db push`
  - Configure Row Level Security (RLS) policies
  - Set up database backups

- [ ] **Application URLs**
  - Set `NEXT_PUBLIC_APP_URL` to production domain
  - Set `NEXT_PUBLIC_BASE_URL` to production domain
  - Set `NEXT_PUBLIC_SITE_URL` to production domain
  - Update OAuth redirect URIs (Instagram, Facebook)
  - Update CORS settings in Supabase

### ✅ Payment Gateway

- [ ] **Xendit (Primary)**
  - Get production API keys from Xendit Dashboard
  - Update `XENDIT_SECRET_KEY` to production key
  - Update `XENDIT_PUBLIC_KEY` to production key
  - Configure webhook URLs in Xendit Dashboard
  - Update `XENDIT_WEBHOOK_TOKEN` for webhook verification
  - Test payment flows in production

- [ ] **Midtrans (Alternative)**
  - Get production API keys from Midtrans Dashboard
  - Update `MIDTRANS_SERVER_KEY` to production key
  - Update `NEXT_PUBLIC_MIDTRANS_CLIENT_KEY` to production key
  - Set `MIDTRANS_IS_PRODUCTION=true`
  - Update API URLs to production endpoints
  - Configure webhook URLs

### ✅ Push Notifications

- [ ] **Firebase Cloud Messaging**
  - Create Firebase project
  - Get web app configuration
  - Update all `NEXT_PUBLIC_FIREBASE_*` variables
  - Generate VAPID keys: `npx web-push generate-vapid-keys`
  - Update `NEXT_PUBLIC_VAPID_KEY` and `VAPID_*` variables
  - Upload service account JSON for admin SDK
  - Configure `FIREBASE_PRIVATE_KEY`, `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PROJECT_ID`
  - Test push notifications on production

### ✅ Email Service

- [ ] **Resend Email**
  - Create Resend account
  - Get API key from resend.com/api-keys
  - Update `RESEND_API_KEY`
  - Verify sending domain
  - Test email delivery

### ✅ Error Tracking

- [ ] **Sentry**
  - Create Sentry project
  - Update `NEXT_PUBLIC_SENTRY_DSN` to production DSN
  - Update `SENTRY_ORG` and `SENTRY_PROJECT`
  - Generate auth token for CI/CD
  - Update `SENTRY_AUTH_TOKEN`
  - Configure release tracking
  - Set up alert rules

### ✅ Social Media Integration

- [ ] **Instagram**
  - Create Facebook App with Instagram Basic Display
  - Update `INSTAGRAM_APP_ID`
  - Update `INSTAGRAM_APP_SECRET`
  - Update `INSTAGRAM_REDIRECT_URI` to production callback URL
  - Submit for production approval

- [ ] **Facebook**
  - Create Facebook App
  - Update `FACEBOOK_APP_ID`
  - Update `FACEBOOK_APP_SECRET`
  - Update `FACEBOOK_PAGE_ID`
  - Configure OAuth redirect URIs
  - Submit for production approval

### ✅ Security

- [ ] **API Security**
  - Generate strong secrets for `ADMIN_API_SECRET`
  - Generate strong secrets for `CRON_SECRET`
  - Ensure all secrets are at least 32 characters
  - Never commit secrets to git
  - Use environment variable injection in deployment

- [ ] **HTTPS**
  - Configure SSL/TLS certificate
  - Force HTTPS redirects
  - Update cookie settings for secure flag

- [ ] **Database Security**
  - Enable Row Level Security (RLS)
  - Review all RLS policies
  - Limit service role key usage
  - Configure connection pooling
  - Set up database firewall rules

### ✅ Performance

- [ ] **Caching**
  - Configure Redis or similar for caching
  - Enable CDN for static assets
  - Configure cache headers
  - Set up database query caching

- [ ] **Optimization**
  - Enable Next.js production optimizations
  - Configure image optimization
  - Enable compression (gzip/brotli)
  - Minimize bundle size

### ✅ Monitoring

- [ ] **Application Monitoring**
  - Set up uptime monitoring
  - Configure performance monitoring
  - Set up log aggregation
  - Configure alerting

- [ ] **Database Monitoring**
  - Enable Supabase logs
  - Set up database metrics
  - Configure slow query logging
  - Set up backup monitoring

### ✅ Backup & Recovery

- [ ] **Database Backups**
  - Enable Supabase automatic backups
  - Configure backup retention policy
  - Test backup restoration
  - Document recovery procedures

- [ ] **Application Backups**
  - Set up code repository backups
  - Document deployment rollback procedure
  - Configure environment variable backups

## 🔐 Environment Variables Reference

### Required for Production

```bash
# Core
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
NEXT_PUBLIC_SITE_URL=https://yourdomain.com

# Payment (Xendit or Midtrans)
XENDIT_SECRET_KEY=xnd_production_...
XENDIT_WEBHOOK_TOKEN=...
XENDIT_PUBLIC_KEY=xnd_public_production_...

# Push Notifications
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

# Email
RESEND_API_KEY=re_xxx

# Error Tracking
NEXT_PUBLIC_SENTRY_DSN=https://xxx@oxxx.ingest.sentry.io/xxx
SENTRY_ORG=your-org
SENTRY_PROJECT=daily-worker-hub

# Security
ADMIN_API_SECRET=xxx
CRON_SECRET=xxx
```

### Optional

```bash
# Social Media
INSTAGRAM_APP_ID=xxx
INSTAGRAM_APP_SECRET=xxx
INSTAGRAM_REDIRECT_URI=https://yourdomain.com/auth/instagram/callback
FACEBOOK_APP_ID=xxx
FACEBOOK_APP_SECRET=xxx
FACEBOOK_PAGE_ID=xxx

# Alternative Payment
MIDTRANS_SERVER_KEY=xxx
NEXT_PUBLIC_MIDTRANS_CLIENT_KEY=xxx
MIDTRANS_IS_PRODUCTION=true
```

## 🚀 Deployment Steps

1. **Prepare Environment**
   - Copy `.env.local.example` to `.env.local`
   - Fill in all production values
   - Verify no placeholder values remain

2. **Database Setup**
   - Create Supabase production project
   - Run migrations: `supabase db push`
   - Seed initial data if needed

3. **Build Application**
   - Install dependencies: `npm ci`
   - Build: `npm run build`
   - Verify build succeeds

4. **Deploy**
   - Deploy to Vercel/your hosting platform
   - Inject environment variables
   - Verify deployment URL

5. **Post-Deployment**
   - Test critical flows (auth, booking, payment)
   - Verify error tracking (Sentry)
   - Test push notifications
   - Monitor logs for errors

## ⚠️ Security Notes

- **NEVER** commit `.env.local` to git
- Use different API keys for development and production
- Rotate secrets regularly
- Limit API key permissions to minimum required
- Enable API key usage monitoring
- Set up IP whitelisting where possible

## 📊 Monitoring Checklist

- [ ] Application uptime > 99.9%
- [ ] Database response time < 100ms
- [ ] Error rate < 0.1%
- [ ] Payment success rate > 99%
- [ ] Push notification delivery rate > 95%

---

**Last Updated:** 2026-03-20
**Maintained by:** Daily Worker Hub Team
