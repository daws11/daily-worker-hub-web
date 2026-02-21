# Operations - Daily Worker Hub Web MVP

**Project:** Daily Worker Hub - Web MVP
**Platform:** Next.js + Supabase Local (Self-Hosted)
**Version:** 1.0
**Last Updated:** February 21, 2026

---

## 👥 Team Structure

### Phase 1-2 (MVP + Admin Dashboard) - Current Phase

**Founders (2)**

#### David (Tech Lead, Full Stack Developer)
**Responsibilities:**
- Next.js App development (Business Portal, Worker Portal)
- Supabase Local setup & database management
- Backend API development (Supabase Edge Functions)
- System architecture & design
- Code reviews & technical decisions
- DevOps & deployment (VPS, Nginx, Docker)

**Time Commitment:** Full-time (40+ hours/week)

---

#### Sasha (AI Co-founder)
**Responsibilities:**
- AI automation & workflows
- Code reviews & documentation
- Analytics & reporting (Recharts dashboards)
- Community platform features
- Operational support (monitoring, alerts)
- Product strategy & roadmap

**Time Commitment:** Part-time (20-30 hours/week)

---

**External Contractors**

#### UI/UX Designer (Part-time)
**Responsibilities:**
- Design system (shadcn/ui customization)
- Component library design
- User flow design (wireframes, mockups)
- Responsive design (mobile-first)
- Accessibility (WCAG 2.1 AA compliance)

**Time Commitment:** Part-time (10-15 hours/week)
**Duration:** Phase 1-2 (8-10 weeks)

---

#### QA Tester (Freelance)
**Responsibilities:**
- Manual testing of all user flows
- Bug reporting & tracking
- UAT (User Acceptance Testing)
- Cross-browser testing
- Mobile responsive testing

**Time Commitment:** As needed (during testing phases)
**Duration:** Beta testing phase (2-3 weeks)

---

### Phase 3-4 (Community Platform + AI Features)

**Founders (2)**

#### David (Tech Lead)
**Responsibilities:**
- Community platform architecture
- Real-time features (Supabase Realtime)
- AI features integration (OpenAI/Anthropic)
- Admin Dashboard development
- System scalability & performance

**Time Commitment:** Full-time (40+ hours/week)

---

#### Sasha (AI Co-founder / AI Operations)
**Responsibilities:**
- AI model training & optimization
- Smart matching algorithms
- AI chatbot development
- Community moderation (AI-powered)
- Analytics & insights
- Documentation & knowledge base

**Time Commitment:** Full-time (30-40 hours/week)

---

**Hiring (3 new team members)**

#### Community Manager (1)
**Responsibilities:**
- Manage community platform (forum, discussions)
- Content moderation (community guidelines)
- Feature request management
- User engagement & retention
- Community events & webinars
- User feedback collection

**Time Commitment:** Full-time (40 hours/week)
**Skills Required:**
- Community management experience
- Strong communication skills
- Bahasa Indonesia & English
- Social media management

---

#### AI Engineer (1)
**Responsibilities:**
- Build AI features (smart matching, recommendations)
- Implement ML models (job demand forecasting, churn prediction)
- Integrate OpenAI/Anthropic APIs
- Optimize AI performance & cost
- AI-powered moderation (spam detection)

**Time Commitment:** Full-time (40 hours/week)
**Skills Required:**
- Machine Learning experience (Python, TensorFlow/PyTorch)
- OpenAI/Anthropic API integration
- NLP experience (natural language processing)
- Database optimization for ML features

---

#### Support Specialist (1)
**Responsibilities:**
- Handle user support tickets (email, chat)
- Resolve payment issues
- Assist with account verification (KYC)
- Escalate critical issues to founders
- Create support documentation (FAQ, help center)
- Monitor user satisfaction

**Time Commitment:** Full-time (40 hours/week)
**Skills Required:**
- Customer support experience
- Problem-solving skills
- Bahasa Indonesia & English
- Technical troubleshooting

---

### Phase 5+ (Growth & Expansion)

**Founders (2)**

#### David (CTO - Chief Technology Officer)
**Responsibilities:**
- Technical strategy & roadmap
- Team management (engineering team)
- System architecture (scalability, performance)
- Vendor management (payment gateways, cloud providers)
- Security & compliance oversight
- Technical partnerships & integrations

**Time Commitment:** Full-time (40+ hours/week)

---

#### Sasha (AI Operations)
**Responsibilities:**
- AI model operations (MLOps)
- AI feature development & optimization
- Data analytics & insights
- AI cost management
- AI automation & workflows
- Documentation & knowledge base

**Time Commitment:** Full-time (30-40 hours/week)

---

**Team (10+ team members)**

#### Engineering Team (3-4)
**Roles:**
- Senior Backend Engineer (1) - Supabase, Edge Functions, API optimization
- Senior Frontend Engineer (1) - Next.js, React, performance optimization
- Full Stack Developer (1) - Business Portal, Worker Portal features
- DevOps Engineer (1) - VPS, Docker, CI/CD, monitoring

**Time Commitment:** Full-time (40 hours/week each)

---

#### Product Team (1-2)
**Roles:**
- Product Manager (1) - Roadmap, user research, prioritization
- UI/UX Designer (1) - Design system, user flows, prototypes

**Time Commitment:** Full-time (40 hours/week each)

---

#### Operations Team (2-3)
**Roles:**
- Community Manager (1) - Community engagement, moderation, events
- Support Lead (1) - Support team management, escalations
- Marketing Coordinator (1) - Social media, content marketing, events

**Time Commitment:** Full-time (40 hours/week each)

---

#### Growth Team (2)
**Roles:**
- Business Development Manager (1) - Partnerships, enterprise sales, regional expansion
- Growth Marketing Manager (1) - User acquisition, referral programs, retention

**Time Commitment:** Full-time (40 hours/week each)

---

## 🏗️ Infrastructure

### Current Infrastructure (Phase 1-2 - MVP + Admin Dashboard)

#### Hosting

**Provider:** DigitalOcean / Contabo

**Plan:**
- **VPS:** 4GB RAM, 2 vCPUs, 80GB SSD, 4TB Bandwidth
- **Location:** Singapore (closest to Indonesia)
- **Cost:** $24/month

**Services on VPS:**
- Next.js App (Port 3000)
- Supabase Local (Docker, Ports 5432, 8000, 9999, 4000, 5000)
- Nginx (Reverse Proxy, Port 80/443)
- PM2 (Process Manager)

**Nginx Configuration:**
```nginx
# Reverse proxy to Next.js
location / {
  proxy_pass http://localhost:3000;
  proxy_http_version 1.1;
  proxy_set_header Upgrade $http_upgrade;
  proxy_set_header Connection 'upgrade';
  proxy_set_header Host $host;
}

# Reverse proxy to Supabase Studio (admin only)
location /studio {
  proxy_pass http://localhost:8000;
  auth_basic "Supabase Studio";
  auth_basic_user_file /etc/nginx/.htpasswd;
}
```

---

#### Database

**Provider:** Supabase Local (Self-hosted via Docker)

**Plan:**
- **PostgreSQL 15+** (Docker container)
- **Storage:** 50GB (within VPS disk)
- **Connection Pooling:** Supabase managed
- **Backups:** Daily automated backups (Supabase CLI)

**Supabase Local Services:**
| Service | Port | Purpose |
|---------|------|---------|
| PostgreSQL | 5432 | Database |
| GoTrue (Auth) | 9999 | Authentication |
| PostgREST (API) | 3000 | REST API |
| Realtime | 4000 | WebSockets (live updates) |
| Storage | 5000 | File storage (S3-compatible) |
| Studio | 8000 | Admin UI (database management) |

**Database Backups:**
```bash
# Daily backup via cron
0 2 * * * /usr/local/bin/supabase db dump -f /backups/db-$(date +\%Y\%m\%d).sql

# Keep last 30 days
0 3 * * * find /backups -name "db-*.sql" -mtime +30 -delete
```

---

#### Domains

**Provider:** Hostinger MCP

**Domains:**
- **dailyworkerhub.com** - Main application (Business Portal + Worker Portal)
- **admin.dailyworkerhub.com** - Admin Dashboard (same VPS, separate subdomain)
- **community.dailyworkerhub.com** - Community Platform (same VPS, separate subdomain)

**DNS Configuration:**
```
A Record: dailyworkerhub.com → [VPS-IP]
A Record: admin.dailyworkerhub.com → [VPS-IP]
A Record: community.dailyworkerhub.com → [VPS-IP]
```

---

#### Monitoring

**Tools:**
- **Supabase Dashboard** - Database metrics, query performance
- **Nginx Access Logs** - Web server monitoring
- **PM2 Monitoring** - Process monitoring (Next.js app)
- **Console Logs** - Application logs

**Monitoring Commands:**
```bash
# Check Next.js app status
pm2 status

# Check Nginx access logs
tail -f /var/log/nginx/access.log

# Check Supabase logs
docker logs supabase_db -f

# System resources (CPU, RAM, Disk)
htop
```

---

### Future Infrastructure (Phase 3-4 - Community Platform + AI Features)

#### Hosting (Upgraded)

**Provider:** DigitalOcean / AWS Lightsail

**Plan:**
- **VPS:** 8GB RAM, 4 vCPUs, 160GB SSD, 5TB Bandwidth
- **Location:** Singapore (closest to Indonesia)
- **Cost:** $48-80/month

**Additional Services:**
- **Staging Environment:** Separate VPS (2GB RAM, 1 vCPU, $16/month)
- **Load Balancer:** Nginx Load Balancer (VPS, $10/month)

**Total Hosting Cost:** $74-106/month

---

#### Database (Upgraded)

**Provider:** Supabase Pro (Self-hosted with better resources)

**Plan:**
- **PostgreSQL 15+** (Docker container, upgraded resources)
- **Storage:** 200GB (dedicated SSD)
- **Connection Pooling:** Supabase managed (50+ connections)
- **Read Replicas:** 1 read replica (for read-heavy queries)
- **Backups:** Daily automated backups + 7-day retention + point-in-time recovery

**Database Optimization:**
```sql
-- Read replica for analytics queries
CREATE PUBLICATION analytics_publication FOR TABLE jobs, bookings, transactions;

-- Materialized views for fast analytics
CREATE MATERIALIZED VIEW mv_daily_revenue AS
SELECT date(created_at) as day, sum(amount) as revenue
FROM transactions
WHERE type = 'payment' AND status = 'completed'
GROUP BY date(created_at);

CREATE UNIQUE INDEX ON mv_daily_revenue(day);

-- Refresh every hour
REFRESH MATERIALIZED VIEW CONCURRENTLY mv_daily_revenue;
```

---

#### CDN (Content Delivery Network)

**Provider:** Cloudflare

**Plan:**
- **CDN:** Cloudflare Free Tier
- **Features:**
  - Static assets caching (images, CSS, JS)
  - DDoS protection
  - SSL/TLS termination
  - Geographic distribution (global edge)

**Cloudflare Configuration:**
```
Caching Rules:
- Static assets (images, fonts, CSS, JS): Cache for 1 year
- API routes: Bypass cache (no caching)
- HTML pages: Cache for 1 hour (respect cache-control headers)

Page Rules:
- Force HTTPS: Always
- Browser Cache TTL: 4 hours
- Auto Minify: CSS, JS, HTML
```

---

#### Media Handling

**Provider:** Supabase Storage (Self-hosted)

**Plan:**
- **Storage:** 100GB (within VPS disk)
- **Features:**
  - Image optimization (WebP, AVIF)
  - Image resizing (on-the-fly)
  - Video transcoding (optional, future)
  - CDN integration (Cloudflare)

**Image Optimization:**
```typescript
// Image optimization via Supabase Storage
const getOptimizedImage = (imageUrl: string, width: number, quality: number = 80) => {
  return `${imageUrl}?width=${width}&quality=${quality}&format=webp`
}

// Example: Get 800px WebP image
const optimizedImage = getOptimizedImage('https://storage.dailyworkerhub.com/worker-avatar.jpg', 800)
```

---

#### Monitoring (Upgraded)

**Tools:**
- **Sentry** - Error tracking & monitoring (https://sentry.io)
- **PostHog** - User analytics & events (https://posthog.com)
- **Grafana + Prometheus** - Metrics & dashboards
- **PagerDuty** - Alerting & incident management

**Sentry Configuration:**
```typescript
// sentry.config.ts
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
  tracesSampleRate: 0.1, // 10% of transactions sampled
  replaysSessionSampleRate: 0.1, // 10% of sessions recorded
  beforeSend(event) {
    // Filter sensitive data (passwords, tokens)
    if (event.request) {
      delete event.request.headers
      delete event.request.cookies
    }
    return event
  },
})
```

**Monitoring Dashboards:**
- **Error Dashboard:** Real-time error tracking (Sentry)
- **Performance Dashboard:** Response times, page load times (PostHog)
- **User Analytics:** Active users, retention, engagement (PostHog)
- **System Metrics:** CPU, RAM, Disk, Network (Grafana)

**Alerting:**
- **Critical:** App down, payment failures, database errors (immediate SMS/Slack)
- **Warning:** High response time, high error rate (email)
- **Info:** Daily summary reports (email)

---

## 💰 Cost Projections

### Phase 1-2 (MVP + Admin Dashboard)

**Monthly Costs:**

| Component | Provider | Cost | Notes |
|-----------|----------|------|-------|
| **VPS** | DigitalOcean / Contabo | $24/month | 4GB RAM, 2 vCPUs, 80GB SSD |
| **Supabase Local** | Self-hosted (Docker) | $0/month | Included in VPS cost |
| **Domains** | Hostinger | ~$10/month | 3 domains (main, admin, community) |
| **SSL/TLS** | Let's Encrypt | $0/month | Free (auto-renewed) |
| **Firebase (Notifications)** | Firebase Free Tier | $0/month | 10,000 messages/month free |
| **Payment Gateway** | Midtrans/Xendit | Transaction fees only | 1.5% - 2.5% per transaction |
| **Email Service** | SendGrid / Resend | $0/month | 100 emails/day free |
| **SMS Service** | Twilio | $0-10/month | 50 SMS/month free |

**Total:** ~$34-44/month

**One-Time Costs:**
- Domain registration: $12/year (first year only)

---

### Phase 3-4 (Community Platform + AI Features)

**Monthly Costs:**

| Component | Provider | Cost | Notes |
|-----------|----------|------|-------|
| **VPS (Production)** | DigitalOcean / Contabo | $48-80/month | 8GB RAM, 4 vCPUs, 160GB SSD |
| **VPS (Staging)** | DigitalOcean / Contabo | $16/month | 2GB RAM, 1 vCPU, 40GB SSD |
| **Load Balancer** | DigitalOcean | $10/month | Nginx Load Balancer |
| **Database** | Self-hosted (Supabase Local) | $0/month | Included in VPS cost |
| **Domains** | Hostinger | ~$10/month | 3 domains |
| **SSL/TLS** | Let's Encrypt | $0/month | Free (auto-renewed) |
| **CDN (Cloudflare)** | Cloudflare Free Tier | $0/month | Static assets caching |
| **Firebase (Notifications)** | Firebase Free Tier | $0-20/month | Scale as needed |
| **AI APIs (OpenAI/Anthropic)** | OpenAI / Anthropic | $50-100/month | Smart search, chatbot, recommendations |
| **Email Service** | SendGrid / Resend | $20-40/month | Scale as needed |
| **SMS Service** | Twilio | $10-20/month | Scale as needed |
| **Payment Gateway** | Midtrans/Xendit | Transaction fees only | 1.5% - 2.5% per transaction |
| **Monitoring (Sentry)** | Sentry | $20-50/month | Error tracking |
| **Monitoring (PostHog)** | PostHog | $0-50/month | User analytics |

**Total:** ~$150-350/month

---

### Phase 5+ (Growth & Expansion)

**Monthly Costs:**

| Component | Provider | Cost | Notes |
|-----------|----------|------|-------|
| **VPS (Production)** | AWS / DigitalOcean | $100-200/month | 16GB RAM, 8 vCPUs, 320GB SSD |
| **VPS (Staging)** | AWS / DigitalOcean | $50/month | 4GB RAM, 2 vCPUs, 80GB SSD |
| **Load Balancer** | AWS ELB | $20-30/month | High availability |
| **Database** | Self-hosted (Supabase Local) | $0/month | Included in VPS cost |
| **Read Replica** | Self-hosted (Docker) | $30-50/month | Dedicated read replica |
| **Domains** | Hostinger | ~$10/month | 3+ domains |
| **SSL/TLS** | Let's Encrypt | $0/month | Free (auto-renewed) |
| **CDN (Cloudflare)** | Cloudflare Pro | $20/month | Advanced caching, WAF |
| **Firebase (Notifications)** | Firebase Spark/Blaze | $50-100/month | Scale as needed |
| **AI APIs (OpenAI/Anthropic)** | OpenAI / Anthropic | $200-500/month | Heavy AI usage |
| **Email Service** | SendGrid / Resend | $50-100/month | Scale as needed |
| **SMS Service** | Twilio | $50-100/month | Scale as needed |
| **Payment Gateway** | Midtrans/Xendit | Transaction fees only | 1.5% - 2.5% per transaction |
| **Monitoring (Sentry)** | Sentry | $50-100/month | Error tracking |
| **Monitoring (PostHog)** | PostHog | $50-100/month | User analytics |
| **Monitoring (Grafana/Prometheus)** | Self-hosted (Docker) | $0/month | Included in VPS cost |
| **PagerDuty** | PagerDuty | $20-50/month | Alerting & incident management |

**Total:** ~$500-1,200/month

---

### Annual Cost Projections

**Phase 1-2 (Year 1):**
- Monthly: ~$34-44
- Annual: ~$400-530

**Phase 3-4 (Year 2):**
- Monthly: ~$150-350
- Annual: ~$1,800-4,200

**Phase 5+ (Year 3+):**
- Monthly: ~$500-1,200
- Annual: ~$6,000-14,400

---

### Cost Optimization Strategies

**Phase 1-2 (MVP):**
- ✅ Self-hosted Supabase (saves $25-50/month vs Supabase Pro)
- ✅ Free SSL (Let's Encrypt, saves $100-200/year)
- ✅ Free monitoring (Supabase Dashboard, saves $20-50/month)
- ✅ Free CDN (Cloudflare Free Tier, saves $20/month)

**Phase 3-4 (Community + AI):**
- ✅ Shared VPS for staging (saves $16/month)
- ✅ AI API caching (reduce OpenAI costs by 30-50%)
- ✅ Database read replica (improve performance without expensive managed DB)
- ✅ Email queuing (batch sends, reduce email costs)

**Phase 5+ (Growth):**
- ✅ Auto-scaling VPS (scale up/down based on traffic)
- ✅ Cloudflare Enterprise caching (reduce bandwidth costs)
- ✅ Multi-region deployment (reduce latency, improve UX)
- ✅ Database sharding (scale horizontally)

---

**Document Owner:** Sasha (AI Co-founder)
**Last Review:** February 21, 2026
**Next Review:** Monthly (every month, adjust based on actual costs)
