# Production Deployment Checklist

> **Daily Worker Hub - MVP Launch Preparation**
> Created: 2026-03-18
> Status: 🟡 In Progress

---

## 📋 Overview

This checklist ensures a smooth production deployment for Daily Worker Hub MVP. Complete all items before launch.

**Target Launch Date:** TBD
**Current MVP Progress:** ~75%

---

## 1. Environment & Configuration

### Environment Variables

- [ ] **Production `.env` configured** with all required variables
- [ ] `NEXT_PUBLIC_APP_URL` - Production domain
- [ ] `NEXT_PUBLIC_SUPABASE_URL` - Production Supabase project URL
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Production anon key
- [ ] `SUPABASE_SERVICE_ROLE_KEY` - Service role key (server-side only)
- [ ] `XENDIT_SECRET_KEY` - Production Xendit secret key
- [ ] `XENDIT_PUBLIC_KEY` - Production Xendit public key
- [ ] `XENDIT_WEBHOOK_VERIFICATION_TOKEN` - Production webhook token
- [ ] `RESEND_API_KEY` - For transactional emails (if used)
- [ ] `JWT_SECRET` - For session tokens (if applicable)

### Secrets Management

- [ ] Store secrets in Vercel Environment Variables (or chosen hosting)
- [ ] Never commit `.env.local` or `.env.production` to git
- [ ] Document all required env vars in `.env.example`

---

## 2. Database & Supabase

### Production Supabase Project

- [ ] **Create production Supabase project** (separate from development)
- [ ] Run all migrations on production database
- [ ] Verify Row Level Security (RLS) policies are enabled
- [ ] Set up database backups (daily automatic backups)
- [ ] Configure connection pooling (Supabase Pooler)

### Data Migration

- [ ] Export seed/demo data (if needed for production)
- [ ] Verify all tables exist with correct schema
- [ ] Test database connection from production app

### Storage Buckets

- [ ] Create `avatars` bucket (public)
- [ ] Create `kyc-documents` bucket (private)
- [ ] Create `job-attachments` bucket (private)
- [ ] Configure bucket policies

---

## 3. Payment Integration (Xendit)

### Xendit Production Setup

- [ ] **Create production Xendit account** (if not exists)
- [ ] Complete business verification with Xendit
- [ ] Get production API keys (secret + public)
- [ ] Configure webhook URLs in Xendit Dashboard:
  - `https://yourdomain.com/api/webhooks/xendit`
  - `https://yourdomain.com/api/webhooks/xendit/disbursement`
- [ ] Set webhook verification token
- [ ] Test all payment flows in sandbox first ✅ (BLOCKED - needs manual testing)

### Payment Methods

- [ ] QRIS enabled
- [ ] Virtual Accounts (BCA, Mandiri, BNI, BRI) enabled
- [ ] Disbursement to bank accounts enabled

### Compliance

- [ ] Verify Xendit fee structure for production
- [ ] Set up disbursement callback handling
- [ ] Test refund/void scenarios

---

## 4. Security

### Authentication

- [ ] Supabase Auth configured for production
- [ ] Email templates customized (verification, password reset)
- [ ] Session timeout configured appropriately
- [ ] Rate limiting on auth endpoints

### API Security

- [ ] All API routes use proper authentication
- [ ] Server-side validation with Zod schemas
- [ ] Rate limiting on sensitive endpoints (payments, bookings)
- [ ] CORS configured correctly
- [ ] CSRF protection enabled

### Data Protection

- [ ] PII data encrypted at rest (Supabase handles this)
- [ ] Sensitive data not logged
- [ ] KYC documents stored securely (private bucket)
- [ ] Password requirements enforced

### Headers & HTTPS

- [ ] HTTPS enforced (SSL certificate)
- [ ] Security headers configured:
  - `X-Frame-Options: DENY`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: strict-origin-when-cross-origin`
  - `Permissions-Policy` configured

---

## 5. Performance

### Next.js Optimization

- [ ] `npm run build` completes without errors
- [ ] Image optimization enabled (`next/image`)
- [ ] Font optimization enabled
- [ ] Bundle size acceptable (< 500KB initial load)
- [ ] Static pages pre-rendered where possible

### Caching

- [ ] Static assets cached with long TTL
- [ ] API responses cached appropriately
- [ ] ISR (Incremental Static Regeneration) configured for public pages

### Monitoring

- [ ] Lighthouse score > 80 for all key pages
- [ ] Core Web Vitals in green zone
- [ ] No console errors in production build

---

## 6. Monitoring & Logging

### Error Tracking

- [ ] Set up error monitoring (Sentry, LogSnag, or similar)
- [ ] Configure alerting for critical errors
- [ ] Add comprehensive error logging to all API routes (Task #4)

### Analytics

- [ ] Google Analytics or Plausible configured
- [ ] Event tracking for key actions (signup, booking, payment)
- [ ] Privacy policy updated for analytics

### Uptime Monitoring

- [ ] Set up uptime monitoring (UptimeRobot, Better Uptime)
- [ ] Configure status page (optional)

---

## 7. Testing

### E2E Tests

- [ ] All E2E tests passing locally
- [ ] Critical user flows tested:
  - [ ] Worker registration & onboarding
  - [ ] Business registration & onboarding
  - [ ] Job posting flow
  - [ ] Application & interview flow
  - [ ] Booking completion flow
  - [ ] Wallet top-up (Xendit)
  - [ ] Withdrawal flow

### Manual Testing Checklist

- [ ] Test on mobile devices (Android primary)
- [ ] Test on different browsers (Chrome, Safari, Firefox)
- [ ] Test dark mode
- [ ] Test all form validations
- [ ] Test error states
- [ ] Test loading states

---

## 8. Domain & Hosting

### Domain Setup

- [ ] Purchase domain (if not owned)
- [ ] Configure DNS records
- [ ] SSL certificate configured (automatic with Vercel)

### Hosting (Vercel Recommended)

- [ ] Create Vercel project
- [ ] Connect GitHub repository
- [ ] Configure build settings:
  - Build Command: `npm run build`
  - Output Directory: `.next`
- [ ] Set environment variables in Vercel
- [ ] Configure preview deployments for PRs

### Alternative Hosting

- [ ] Docker container configured (if self-hosting)
- [ ] PM2 or similar process manager
- [ ] Nginx reverse proxy configured

---

## 9. CI/CD Pipeline

### GitHub Actions (or similar)

- [ ] Lint check on PR
- [ ] Type check on PR
- [ ] Unit tests on PR
- [ ] Build check on PR
- [ ] Automatic preview deployment
- [ ] Production deployment on main branch merge

### Deployment Workflow

- [ ] Staging environment (optional)
- [ ] Production deployment requires approval (optional)
- [ ] Rollback procedure documented

---

## 10. Launch Day Checklist

### Pre-Launch (T-1 day)

- [ ] All tests passing
- [ ] Production build successful
- [ ] Environment variables verified
- [ ] Database backups confirmed
- [ ] Team notified of launch

### Launch (T-0)

- [ ] Deploy to production
- [ ] Verify homepage loads
- [ ] Test registration flow
- [ ] Test login flow
- [ ] Test a complete booking flow
- [ ] Monitor error logs for 30 minutes

### Post-Launch (T+1 hour)

- [ ] Check uptime monitor
- [ ] Verify no critical errors
- [ ] Test payment flow with real transaction (small amount)
- [ ] Notify team of successful launch

---

## 11. Post-Launch

### Week 1

- [ ] Daily monitoring of error logs
- [ ] Monitor payment success rates
- [ ] Collect user feedback
- [ ] Address any critical bugs immediately

### Month 1

- [ ] Review analytics data
- [ ] Optimize based on user behavior
- [ ] Plan Phase 2 features

---

## 🚨 Rollback Plan

If critical issues found post-launch:

1. **Immediate:** Revert to previous deployment in Vercel
2. **Database:** Restore from latest backup if data corruption
3. **Payments:** Contact Xendit support if payment issues
4. **Communication:** Notify users via email/in-app notification

---

## 📞 Emergency Contacts

| Role             | Contact                     |
| ---------------- | --------------------------- |
| Lead Developer   | David (@AbdurrahmanFirdaus) |
| Xendit Support   | support@xendit.co           |
| Supabase Support | support@supabase.io         |
| Vercel Support   | support@vercel.com          |

---

## ✅ Sign-Off

- [ ] Technical review completed by: ****\_\_\_****
- [ ] Security review completed by: ****\_\_\_****
- [ ] Product owner approval: ****\_\_\_****
- [ ] Launch authorized by: ****\_\_\_****

---

**Last Updated:** 2026-03-18
**Maintained By:** Sasha (OpenClaw AI Assistant)
