# Production Deployment Guide

Complete step-by-step guide for deploying Daily Worker Hub to production.

## 📋 Table of Contents

- [Prerequisites](#prerequisites)
- [Deployment Options](#deployment-options)
- [Method 1: Vercel (Recommended)](#method-1-vercel-recommended)
- [Method 2: Custom Server](#method-2-custom-server)
- [Post-Deployment Steps](#post-deployment-steps)
- [Monitoring & Maintenance](#monitoring--maintenance)
- [Troubleshooting](#troubleshooting)

## Prerequisites

Before deploying to production, ensure you have:

- [ ] Domain name configured (e.g., `dailyworkerhub.com`)
- [ ] SSL/TLS certificate (automatic with Vercel)
- [ ] Supabase production project created
- [ ] Payment gateway accounts (Xendit/Midtrans)
- [ ] Firebase project configured
- [ ] Resend account for emails
- [ ] Sentry project created
- [ ] Social media API keys (Instagram, Facebook) - optional

See [Production Environment Checklist](PRODUCTION_ENVIRONMENT_CHECKLIST.md) for complete requirements.

## Deployment Options

| Method | Difficulty | Cost | Performance | Best For |
|---------|------------|-------|-------------|------------|
| **Vercel** | ⭐ Easy | Free tier | Excellent | Most projects, recommended |
| **DigitalOcean** | ⭐⭐ Medium | $5+/mo | Good | Custom control |
| **AWS/Google Cloud** | ⭐⭐⭐ Hard | Variable | Excellent | Enterprise |

## Method 1: Vercel (Recommended)

Vercel provides zero-config deployment, automatic HTTPS, global CDN, and serverless functions.

### Step 1: Prepare Repository

```bash
# Ensure all changes are committed
git status
git add .
git commit -m "Pre-production commit"

# Push to GitHub (if not already)
git push origin master
```

### Step 2: Create Vercel Project

1. Go to [vercel.com](https://vercel.com)
2. Sign up/login with GitHub
3. Click "Add New Project"
4. Select `daily-worker-hub` repository
5. Vercel will auto-detect Next.js configuration

### Step 3: Configure Environment Variables

In Vercel project settings > Environment Variables, add all required variables:

```bash
# Core (Required)
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_APP_URL=https://yourdomain.com
NEXT_PUBLIC_BASE_URL=https://yourdomain.com
NEXT_PUBLIC_SITE_URL=https://yourdomain.com

# Payment (Required - Xendit or Midtrans)
XENDIT_SECRET_KEY=xnd_production_...
XENDIT_WEBHOOK_TOKEN=...
XENDIT_PUBLIC_KEY=xnd_public_production_...

# Notifications (Required)
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

# Email (Required)
RESEND_API_KEY=re_xxx

# Error Tracking (Required)
NEXT_PUBLIC_SENTRY_DSN=https://xxx@o0.ingest.sentry.io/0
SENTRY_ORG=your-org
SENTRY_PROJECT=daily-worker-hub

# Security (Required)
ADMIN_API_SECRET=xxx (generate: openssl rand -base64 32)
CRON_SECRET=xxx (generate: openssl rand -base64 32)
```

### Step 4: Configure Build Settings

Vercel auto-detects Next.js, but verify:

- **Framework Preset**: Next.js
- **Build Command**: `npm run build`
- **Output Directory**: `.next`
- **Install Command**: `npm ci`

### Step 5: Deploy

1. Click "Deploy" button
2. Wait for build to complete (2-5 minutes)
3. Vercel will provide a `.vercel.app` URL
4. Configure custom domain in project settings

### Step 6: Configure Custom Domain

1. In Vercel project > Domains
2. Add your domain (e.g., `dailyworkerhub.com`)
3. Vercel will provide DNS records
4. Update your domain's DNS settings:
   ```
   A     @    76.76.21.21
   CNAME www    cname.vercel-dns.com
   ```
5. Wait for DNS propagation (10-60 minutes)

### Step 7: Verify Deployment

```bash
# Check deployment
curl https://yourdomain.com

# Check health endpoint (if exists)
curl https://yourdomain.com/api/health

# Check API docs
curl https://yourdomain.com/api/docs
```

## Method 2: Custom Server

Deploy to VPS (DigitalOcean, AWS, etc.) for more control.

### Step 1: Server Setup

```bash
# Connect to your server
ssh user@your-server-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (18+)
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2

# Install Nginx for reverse proxy
sudo apt install -y nginx

# Install Git
sudo apt install -y git
```

### Step 2: Deploy Application

```bash
# Clone repository
cd /var/www
git clone https://github.com/daws11/daily-worker-hub.git
cd daily-worker-hub

# Install dependencies
npm ci --production=false

# Set up environment variables
nano .env.local
# Add all required variables from PRODUCTION_ENVIRONMENT_CHECKLIST.md

# Build application
npm run build

# Start with PM2
pm2 start npm --name "daily-worker-hub" -- start

# Configure PM2 to start on boot
pm2 startup
pm2 save
```

### Step 3: Configure Nginx

```bash
# Create Nginx config
sudo nano /etc/nginx/sites-available/daily-worker-hub

# Add configuration:
server {
    listen 80;
    server_name yourdomain.com www.yourdomain.com;

    location / {
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

# Enable site
sudo ln -s /etc/nginx/sites-available/daily-worker-hub /etc/nginx/sites-enabled/

# Test and restart Nginx
sudo nginx -t
sudo systemctl restart nginx
```

### Step 4: Configure SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtain SSL certificate
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com

# Certbot will auto-renew with systemd timer
```

### Step 5: Firewall Configuration

```bash
# Configure firewall
sudo ufw allow 22    # SSH
sudo ufw allow 80    # HTTP
sudo ufw allow 443   # HTTPS
sudo ufw enable
```

## Post-Deployment Steps

### 1. Database Setup

```bash
# Ensure Supabase production project is ready
# Run migrations if needed
npx supabase db push

# Verify database connection
# Check app dashboard for any database errors
```

### 2. Configure Payment Gateway

- **Xendit**:
  1. Log in to Xendit Dashboard
  2. Go to Settings > API Keys
  3. Switch to Production mode
  4. Add production API keys to your environment
  5. Configure webhook URL: `https://yourdomain.com/api/webhooks/xendit`

- **Midtrans** (if using):
  1. Log in to Midtrans Dashboard
  2. Switch to Production mode
  3. Add production API keys
  4. Configure webhook URL

### 3. Configure Webhooks

For Xendit, set these webhook endpoints:
- Payment Callback: `https://yourdomain.com/api/webhooks/xendit`
- Disbursement Callback: `https://yourdomain.com/api/webhooks/xendit/disbursement`

Ensure `XENDIT_WEBHOOK_TOKEN` matches what's configured in Xendit Dashboard.

### 4. Test Critical Flows

```bash
# Test authentication
# - Sign up new user
# - Log in
# - Log out

# Test job posting (business account)
# - Create new job
# - Verify job appears in marketplace

# Test booking (worker account)
# - Apply to job
# - Accept application
# - Check booking appears

# Test payment
# - Top up wallet (business)
# - Withdraw earnings (worker)

# Test notifications
# - Trigger notification
# - Verify push notification received

# Test error tracking
# - Visit Sentry dashboard
# - Verify errors are captured
```

### 5. Set Up Monitoring

- **Sentry**: Verify errors are being tracked
- **Supabase**: Monitor database performance
- **Vercel Analytics** (if using): Track page views and performance
- **Custom Monitoring**: Set up uptime monitoring (e.g., UptimeRobot)

## Monitoring & Maintenance

### Daily Checks

- [ ] Review Sentry error logs
- [ ] Check payment transaction logs
- [ ] Monitor database performance
- [ ] Review notification delivery rates
- [ ] Check server resources (if custom server)

### Weekly Checks

- [ ] Review system performance metrics
- [ ] Check for any security updates
- [ ] Backup verification
- [ ] Analytics review

### Monthly Checks

- [ ] Review and rotate secrets (API keys)
- [ ] Update dependencies
- [ ] Security audit
- [ ] Capacity planning

## Troubleshooting

### Build Fails

**Problem**: Build fails during deployment

**Solutions**:
```bash
# Check build locally
npm run build

# Clear cache
rm -rf .next node_modules
npm install
npm run build

# Check for TypeScript errors
npm run type-check
```

### Environment Variables Not Working

**Problem**: App uses default values or fails

**Solutions**:
- Verify environment variable names (case-sensitive)
- Check Vercel project > Environment Variables
- Redeploy after adding variables
- Ensure no trailing spaces in values

### Database Connection Failed

**Problem**: Can't connect to Supabase

**Solutions**:
- Verify `NEXT_PUBLIC_SUPABASE_URL` is correct
- Check Supabase project is active
- Ensure RLS policies allow access
- Test connection manually:
  ```bash
  curl https://your-project.supabase.co/rest/v1/
  ```

### Payment Gateway Errors

**Problem**: Payments fail or webhooks not received

**Solutions**:
- Verify API keys are production (not sandbox)
- Check webhook URL is accessible
- Test webhook endpoint:
  ```bash
  curl -X POST https://yourdomain.com/api/webhooks/xendit
  ```
- Review payment gateway dashboard for error logs

### Push Notifications Not Working

**Problem**: Notifications not delivered

**Solutions**:
- Verify Firebase project configuration
- Check VAPID keys match
- Test FCM token registration
- Check browser notification permissions
- Review Firebase console for errors

### Slow Performance

**Problem**: Application is slow

**Solutions**:
- Enable caching (Redis, CDN)
- Optimize images (Next.js Image component)
- Check database query performance
- Review bundle size (Vercel Analytics)
- Enable compression (Nginx/Cloudflare)

## Rollback Procedure

If deployment causes issues, quickly rollback:

### Vercel

1. Go to Deployments tab
2. Click "..." on previous successful deployment
3. Select "Redeploy" or "Promote to Production"

### Custom Server

```bash
# Stop current version
pm2 stop daily-worker-hub

# Rollback to previous git commit
git checkout <previous-commit-hash>
npm run build
pm2 restart daily-worker-hub
```

## Security Checklist

- [ ] All secrets stored in environment variables (not in code)
- [ ] HTTPS enforced (redirect HTTP to HTTPS)
- [ ] API keys rotated regularly
- [ ] Database backups enabled
- [ ] Firewall configured
- [ ] Rate limiting enabled
- [ ] CORS properly configured
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (Supabase RLS)
- [ ] XSS prevention (React sanitization)

## Cost Estimate

### Vercel Deployment

| Resource | Cost | Notes |
|-----------|-------|--------|
| Hosting | Free | Pro plan: $20/mo for more bandwidth |
| Domain | $10-15/yr | Any registrar |
| SSL | Free | Automatic with Let's Encrypt |
| **Total** | **$0-1/mo** | Minimal cost |

### Custom Server

| Resource | Cost | Notes |
|-----------|-------|--------|
| VPS (2GB RAM) | $6/mo | DigitalOcean |
| Domain | $10-15/yr | Any registrar |
| SSL | Free | Let's Encrypt |
| **Total** | **$6-12/mo** | More control, more maintenance |

## Additional Resources

- [Production Environment Checklist](PRODUCTION_ENVIRONMENT_CHECKLIST.md)
- [Supabase Docs](https://supabase.com/docs)
- [Vercel Docs](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [Xendit Docs](https://developers.xendit.co)
- [Firebase Docs](https://firebase.google.com/docs)

## Support

For deployment issues:
1. Check this guide's troubleshooting section
2. Review [Production Environment Checklist](PRODUCTION_ENVIRONMENT_CHECKLIST.md)
3. Check Sentry for error logs
4. Contact support: support@dailyworkerhub.com

---

**Last Updated**: 2026-03-20
**Maintained by**: Daily Worker Hub Team
