# PRD - Product Requirements Document
**Project:** Daily Worker Hub - Web MVP
**Platform:** Next.js + Supabase
**Version:** 1.0
**Last Updated:** February 21, 2026

---

## 1. Product Vision

> "Daily Worker Hub is a **community-first platform** connecting Bali's hospitality businesses with reliable daily workers, built on **trust, transparency, and compliance** — not just another job board."

### Core Value Propositions

| Value Proposition | Description | Differentiator |
|-------------------|-------------|-----------------|
| **Reliability First** | Reliability score system (1-5 stars) based on attendance, punctuality, and skill | ❌ No competitor tracks this |
| **Compliance Enabled** | Automated PP 35/2021 protection (21-day limit) | ❌ No platform has this |
| **Community-First** | Verified profiles, reviews, events, Community Fund | ❌ Transactional only |
| **Bali-Specific** | Local payment (QRIS), "Rate Bali" based on UMK, area focus | ❌ Generalist only |
| **Fair Wages** | Standardized "Rate Bali" per UMK 2025 | ⚠️ Competitors vary wildly |

---

## 2. Target Users

### 2.1 Primary: Businesses (Demand Side)

| User Type | Description | Pain Points |
|-----------|-------------|-------------|
| **Hotel HR Managers** | Manage staff for hotels, villas, resorts | Workers don't show up, no reliability data, compliance risk |
| **Restaurant Owners** | Need daily cooks, servers, kitchen helpers | Unreliable workers, seasonal staffing needs |
| **Villa Operators** | Short-term staff for cleaning, maintenance | Ad-hoc hiring, no trusted worker pool |
| **Event Planners** | Need large teams for events | Last-minute hiring, quality concerns |

**Key Motivations:**
- Find reliable workers quickly
- Reduce no-show rates
- Comply with labor regulations (PP 35/2021)
- Access pre-vetted, quality workers

### 2.2 Secondary: Workers (Supply Side)

| User Type | Description | Pain Points |
|-----------|-------------|-------------|
| **Daily Hospitality Workers** | Housekeeping, stewards, servers, bartenders | Income instability, no job security, no benefits |
| **Kitchen Staff** | Cooks, helpers, dishwashers | Seasonal work, low pay, inconsistent hours |
| **Drivers** | Airport transfers, tour drivers | Irregular bookings, no reliability system |

**Key Motivations:**
- Consistent income opportunities
- Fair "Rate Bali" wages (UMK-based)
- Community benefits (BPJS, insurance)
- Build reputation through reliability

---

## 3. User Stories (MVP)

### 3.1 Business User Stories

#### Epic: Job Posting & Management

| Story ID | User Story | Acceptance Criteria | Priority |
|----------|------------|---------------------|----------|
| **BS-001** | As a business, I want to **create a job posting** with shift details (date, time, position, requirements) | - Can input: position, date, time, location, number of workers, requirements<br>- Can set wage rate or use "Rate Bali" default<br>- Can post immediately or schedule for later<br>- Posting appears in worker marketplace | P0 (Must Have) |
| **BS-002** | As a business, I want to **view my posted jobs** with status (open, filled, cancelled) | - Dashboard shows all jobs with status<br>- Can cancel job before acceptance<br>- See applicant count per job | P0 |
| **BS-003** | As a business, I want to **filter marketplace workers** by skill, location, reliability score | - Filter by: position type, area (Badung, Denpasar, etc.), reliability score (min 4.0+)<br>- Search by name or skill tags | P1 |
| **BS-004** | As a business, I want to **book workers** for my shifts | - Select workers from filtered list<br>- Send booking request<br>- Worker receives notification | P0 |
| **BS-005** | As a business, I want to **manage booking requests** (accept/reject workers) | - View incoming worker applications<br>- Accept or reject applicants<br>- Automatic confirmation when accepted | P0 |
| **BS-006** | As a business, I want to **track worker attendance** (check-in/out) | - QR code check-in for workers<br>- GPS verification optional<br>- Automatic time recording | P1 |

#### Epic: Wallet & Payments

| Story ID | User Story | Acceptance Criteria | Priority |
|----------|------------|---------------------|----------|
| **BS-007** | As a business, I want to **top up my wallet** via QRIS (Xendit/Midtrans) | - Enter amount (min Rp 500.000)<br>- Pay via QRIS<br>- Balance updates immediately<br>- Transaction history | P0 |
| **BS-008** | As a business, I want to **view my wallet balance** and transaction history | - Dashboard shows current balance<br>- View all transactions (deposits, payouts)<br>- Download transaction report | P0 |
| **BS-009** | As a business, I want **automatic settlement** after completed shift | - Payment deducted from wallet<br>- Worker credited to their wallet<br>- Compliance record created | P1 |

#### Epic: Compliance & Reports

| Story ID | User Story | Acceptance Criteria | Priority |
|----------|------------|---------------------|----------|
| **BS-010** | As a business, I want to **view compliance warnings** (21-day limit) | - Warning at day 15-18 for same worker<br>- Blocked at day 21<br>- Alternative workers suggested | P0 |
| **BS-011** | As a business, I want to **download digital contracts** for completed shifts | - Auto-generated e-contract<br>- Includes: dates, position, rate, parties<br>- PDF download | P2 |
| **BS-012** | As a business, I want to **view reliability reports** for workers I've hired | - Worker profile shows: attendance %, punctuality %, rating history<br>- Filter by date range | P1 |

### 3.2 Worker User Stories

#### Epic: Profile & Discovery

| Story ID | User Story | Acceptance Criteria | Priority |
|----------|------------|---------------------|----------|
| **WS-001** | As a worker, I want to **create my profile** with skills, experience, and location | - Upload photo (optional)<br>- Add: full name, phone, area, skills, experience<br>- KYC verification (KTP OCR + selfie) | P0 |
| **WS-002** | As a worker, I want to **browse available jobs** in my area | - Filter by: position, date, location, wage range<br>- Sort by: date, wage rate, distance<br>- View job details in full | P0 |
| **WS-003** | As a worker, I want to **apply for jobs** with one tap | - Apply button on job card<br>- Application sent to business<br>- Receive confirmation | P0 |
| **WS-004** | As a worker, I want to **view my job applications** and their status | - Dashboard shows: pending, accepted, rejected<br>- See job details for each application | P0 |
| **WS-005** | As a worker, I want to **view my reliability score** and rating history | - Score display: 1-5 stars<br>- Breakdown: attendance %, punctuality %, average rating<br>- Feedback from businesses | P1 |

#### Epic: Wallet & Earnings

| Story ID | User Story | Acceptance Criteria | Priority |
|----------|------------|---------------------|----------|
| **WS-006** | As a worker, I want to **view my wallet balance** and earnings | - Dashboard shows: available balance, pending earnings<br>- Earnings breakdown: completed shifts, tips (future)<br>- Transaction history | P0 |
| **WS-007** | As a worker, I want to **withdraw earnings** to my bank account | - Enter bank details (BCA, Mandiri, BNI, BRI)<br>- Minimum withdrawal: Rp 100.000<br>- 1 free withdrawal per week<br>- Processed within 24 hours | P0 |
| **WS-008** | As a worker, I want to **receive payment** immediately after shift completion | - Auto-credited to wallet<br>- Notification sent<br>- Available for withdrawal | P1 |

#### Epic: Attendance & Reviews

| Story ID | User Story | Acceptance Criteria | Priority |
|----------|------------|---------------------|----------|
| **WS-009** | As a worker, I want to **check in** for my shift via QR code | - Scan business QR code at location<br>- GPS verification (optional)<br>- Check-in recorded with timestamp | P1 |
| **WS-010** | As a worker, I want to **view my attendance history** | - Calendar view of all shifts<br>- Status: completed, no-show, cancelled<br>- Earnings per shift | P2 |
| **WS-011** | As a worker, I want to **see reviews** from businesses I've worked with | - List all received reviews<br>- Rating (1-5 stars) + comments<br>- Ability to respond to reviews | P2 |

---

## 4. Core Features (MVP)

### 4.1 Must-Have Features (P0 - Launch Blocking)

| Feature | Description | Tech Stack |
|---------|-------------|------------|
| **Authentication** | Email/password, Google OAuth, Role-based access (business/worker) | Supabase Auth |
| **User Profiles** | Worker profile (skills, location, KYC), Business profile (company info, verification) | Supabase Database + Storage |
| **Job Posting** | Create, edit, delete job postings with shift details | Next.js + Supabase |
| **Job Discovery** | Browse/filter jobs for workers | Next.js + Supabase |
| **Booking System** | Apply for jobs (workers), Accept/reject (businesses) | Supabase Database + Realtime |
| **Wallet System** | Business deposits, Worker earnings, Withdrawals | Supabase Database + Xendit/Midtrans |
| **Payment Integration** | QRIS deposits (businesses), Bank payouts (workers) | Xendit/Midtrans API |
| **Reliability Score** | Score calculation based on attendance, punctuality | Supabase Edge Functions |
| **Compliance Guard** | 21-day limit warning/blocking (PP 35/2021) | Supabase Database + Functions |
| **Notifications** | Email + Push notifications for bookings, payments | Supabase + OneSignal/Firebase |

### 4.2 Should-Have Features (P1 - Post-Launch)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Attendance Tracking** | QR code check-in/out, GPS verification | P1 |
| **Digital Contracts** | Auto-generated e-contracts per shift | P1 |
| **Advanced Filtering** | Multi-filter search (skills, experience, reviews) | P1 |
| **Community Fund Dashboard** | View BPJS status, benefits | P1 |
| **Analytics Dashboard** | Businesses: Hiring trends, spend analysis | P1 |

### 4.3 Nice-to-Have Features (P2 - Future)

| Feature | Description | Priority |
|---------|-------------|----------|
| **Tips System** | Businesses can tip workers | P2 |
| **Skill Badges** | Verified skill certifications | P2 |
| **Referral System** | Invite workers and earn bonuses | P2 |
| **Multi-Language** | English, Bahasa Indonesia | P2 |

---

## 5. Out of Scope (MVP)

| Feature | Reason | Timeline |
|---------|--------|----------|
| **Mobile App** | Web MVP first, PWA for workers | Phase 2 |
| **Live Chat** | Messaging system (in-app chat) | Phase 2 |
| **Review System** | Two-way reviews (businesses ↔ workers) | Phase 2 |
| **Skill Tests** | Online skill verification tests | Phase 2 |
| **AI Matching** | Algorithmic worker-job matching | Phase 3 |
| **Community Forum** | Worker discussion board | Phase 3 |
| **Seasonal Optimization** | Dynamic pricing during peak/low seasons | Phase 3 |
| **Multi-Platform Integration** | Auto-post to Instagram/Facebook | Phase 3 |

---

## 6. Non-Functional Requirements

### 6.1 Performance

| Metric | Target |
|--------|--------|
| Page Load Time | < 2 seconds (first contentful paint) |
| API Response Time | < 500ms (95th percentile) |
| Image Upload | < 3 seconds for 5MB files |
| Database Queries | < 200ms for standard reads |

### 6.2 Scalability

| Metric | Target |
|--------|--------|
| Concurrent Users | Support 1,000+ concurrent users |
| Transactions | Handle 10,000+ transactions/day |
| Database | PostgreSQL with connection pooling |
| CDN | Supabase Storage CDN for assets |

### 6.3 Security

| Requirement | Implementation |
|-------------|-----------------|
| **Authentication** | JWT-based auth (Supabase), Refresh tokens |
| **Data Encryption** | TLS 1.3 for all data in transit, AES-256 at rest |
| **KYC** | KTP OCR + Liveness detection (Verihubs/Vida API) |
| **Payment Security** | PCI DSS compliant via Xendit/Midtrans |
| **Data Privacy** | Comply with Indonesian PDPA regulations |
| **Rate Limiting** | API rate limiting (100 req/min per user) |
| **Input Validation** | Zod schema validation on all inputs |

### 6.4 Reliability

| Metric | Target |
|--------|--------|
| Uptime | 99.5% (planned maintenance excluded) |
| Data Backup | Daily automated backups (Supabase) |
| Error Tracking | Sentry integration for error monitoring |
| Rollback Plan | Zero-downtime deployments with feature flags |

### 6.5 Accessibility

| Requirement | Implementation |
|-------------|-----------------|
| **WCAG 2.1 AA** | Follow accessibility guidelines |
| **Mobile Responsive** | Works on mobile browsers (320px+) |
| **Keyboard Navigation** | Full keyboard support |
| **Screen Reader** | ARIA labels, semantic HTML |

---

## 7. Technical Constraints

| Constraint | Description |
|------------|-------------|
| **Browser Support** | Modern browsers (Chrome 90+, Firefox 88+, Safari 14+, Edge 90+) |
| **Mobile Support** | iOS 14+, Android 10+ |
| **Database** | Supabase PostgreSQL (managed) |
| **Hosting** | Vercel (Next.js) + Supabase (backend) |
| **Payment** | Xendit or Midtrans (QRIS focus) |
| **KYC Provider** | Verihubs or Vida (Indonesia) |
| **Budget** | Keep monthly infra costs under $100 (MVP phase) |

---

## 8. Success Metrics (MVP)

| Metric | Target | Measurement |
|--------|--------|-------------|
| **User Acquisition** | 50 businesses, 500 workers within 3 months | Database count |
| **Transaction Volume** | 1,000+ transactions/month | Transaction logs |
| **Reliability Score Adoption** | 80% of workers with 5+ shifts have score | Database query |
| **Compliance Violations** | 0 PP 35/2021 violations | Monitoring alerts |
| **Retention** | 60% DAU/MAU ratio for active users | Analytics dashboard |
| **Satisfaction** | 4.2+ average rating for reliability | Review system |

---

## 9. Dependencies & Risks

### 9.1 External Dependencies

| Dependency | Provider | Risk Mitigation |
|------------|----------|-----------------|
| **Payment Gateway** | Xendit/Midtrans | Fallback to second provider |
| **KYC API** | Verihubs/Vida | Tiered verification (basic → full) |
| **SMS/OTP** | Twilio/WhatsApp BSP | Use email as fallback |
| **Push Notifications** | OneSignal/Firebase | Email notification fallback |

### 9.2 Technical Risks

| Risk | Impact | Mitigation |
|------|--------|-----------|
| **Supabase Outage** | High | Have read replicas, implement caching |
| **Payment Gateway Downtime** | High | Multiple provider integration |
| **KYC API Rate Limit** | Medium | Implement queue system, retry logic |
| **Mobile Browser Compatibility** | Medium | Extensive testing, polyfills |
| **Database Scaling** | Medium | Monitor query performance, optimize indexes |

---

## 10. Future Enhancements (Post-MVP)

- Phase 2: PWA for workers, Advanced filtering, Attendance tracking
- Phase 3: Native mobile app, AI matching, Multi-platform integration
- Phase 4: Skill tests, Community forum, Seasonal optimization

---

**Document Owner:** Sasha (AI Co-founder)
**Last Review:** February 21, 2026
**Next Review:** After MVP Launch
