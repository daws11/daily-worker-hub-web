# Plan - Roadmap & Task Checklist
**Project:** Daily Worker Hub - Web MVP
**Platform:** Next.js + Supabase
**Version:** 1.0
**Last Updated:** February 21, 2026

---

## Project Status

| Metric | Target | Current | Progress |
|--------|--------|---------|----------|
| Overall Progress | 100% | 0% | 0% |
| Phase 1: Setup & Infrastructure | 100% | 0% | 0% |
| Phase 2: Core Features (Auth & Profiles) | 100% | 0% | 0% |
| Phase 3: Job Management | 100% | 0% | 0% |
| Phase 4: Marketplace & Booking | 100% | 0% | 0% |
| Phase 5: Wallet & Payments | 100% | 0% | 0% |
| Phase 6: Compliance & Reliability | 100% | 0% | 0% |

---

## Phase 1: Setup & Infrastructure

**Goal:** Initialize Next.js project, Supabase, and development environment

| Task ID | Description | Status | Completion Note | Updated |
|---------|-------------|--------|-----------------|----------|
| **P1-T001** | Initialize Next.js 14 project with TypeScript | ❌ Not Started | | - |
| **P1-T002** | Set up Tailwind CSS + shadcn/ui | ❌ Not Started | | - |
| **P1-T003** | Configure Supabase project (database, auth, storage) | ❌ Not Started | | - |
| **P1-T004** | Create folder structure (app/, components/, lib/) | ❌ Not Started | | - |
| **P1-T005** | Set up ESLint + Prettier with TypeScript rules | ❌ Not Started | | - |
| **P1-T006** | Configure TypeScript paths (@/ aliases) | ❌ Not Started | | - |
| **P1-T007** | Set up environment variables (.env.local) | ❌ Not Started | | - |
| **P1-T008** | Create base layout (navbar, sidebar, footer) | ❌ Not Started | | - |
| **P1-T009** | Initialize Git repository with .gitignore | ❌ Not Started | | - |
| **P1-T010** | Set up Vercel for deployment | ❌ Not Started | | - |
| **P1-T011** | Create documentation (README.md, CONTRIBUTING.md) | ❌ Not Started | | - |
| **P1-T012** | Test build and local dev server | ❌ Not Started | | - |

### Phase 1 Checklist

- [ ] Next.js project initialized with App Router
- [ ] TypeScript configured with strict mode
- [ ] Tailwind CSS integrated
- [ ] shadcn/ui components set up
- [ ] Supabase project created and configured
- [ ] Database migrations created (initial schema)
- [ ] Supabase Auth enabled (email + Google OAuth)
- [ ] ESLint + Prettier configured
- [ ] Base layout components created
- [ ] Environment variables set up
- [ ] Local development server tested
- [ ] Vercel deployment tested

---

## Phase 2: Core Features (Auth & Profiles)

**Goal:** Implement authentication and user profile management (Business & Worker)

### 2.1 Authentication

| Task ID | Description | Status | Completion Note | Updated |
|---------|-------------|--------|-----------------|----------|
| **P2-A001** | Create login page with email/password | ❌ Not Started | | - |
| **P2-A002** | Create registration page with role selection | ❌ Not Started | | - |
| **P2-A003** | Implement Google OAuth integration | ❌ Not Started | | - |
| **P2-A004** | Create password reset flow | ❌ Not Started | | - |
| **P2-A005** | Implement session management (JWT) | ❌ Not Started | | - |
| **P2-A006** | Create protected route middleware | ❌ Not Started | | - |
| **P2-A007** | Create logout functionality | ❌ Not Started | | - |
| **P2-A008** | Add loading states for auth operations | ❌ Not Started | | - |
| **P2-A009** | Add error handling for auth failures | ❌ Not Started | | - |
| **P2-A010** | Test auth flows (login, register, logout) | ❌ Not Started | | - |

### 2.2 Profile Management (Business)

| Task ID | Description | Status | Completion Note | Updated |
|---------|-------------|--------|-----------------|----------|
| **P2-B001** | Create business profile registration form | ❌ Not Started | | - |
| **P2-B002** | Implement company name, type, address fields | ❌ Not Started | | - |
| **P2-B003** | Add business license upload | ❌ Not Started | | - |
| **P2-B004** | Create business profile edit page | ❌ Not Started | | - |
| **P2-B005** | Implement profile validation (Zod) | ❌ Not Started | | - |
| **P2-B006** | Add area selection (Badung, Denpasar, etc.) | ❌ Not Started | | - |
| **P2-B007** | Create business profile dashboard view | ❌ Not Started | | - |
| **P2-B008** | Implement verification status display | ❌ Not Started | | - |
| **P2-B009** | Add profile avatar upload (Supabase Storage) | ❌ Not Started | | - |
| **P2-B010** | Test business profile creation and editing | ❌ Not Started | | - |

### 2.3 Profile Management (Worker)

| Task ID | Description | Status | Completion Note | Updated |
|---------|-------------|--------|-----------------|----------|
| **P2-W001** | Create worker profile registration form | ❌ Not Started | | - |
| **P2-W002** | Implement KTP number input with validation | ❌ Not Started | | - |
| **P2-W003** | Add KTP image upload (OCR integration) | ❌ Not Started | | - |
| **P2-W004** | Add selfie upload with liveness check | ❌ Not Started | | - |
| **P2-W005** | Implement date of birth and gender fields | ❌ Not Started | | - |
| **P2-W006** | Add area selection | ❌ Not Started | | - |
| **P2-W007** | Create skills multi-select (tags) | ❌ Not Started | | - |
| **P2-W008** | Add experience years field | ❌ Not Started | | - |
| **P2-W009** | Create worker profile dashboard view | ❌ Not Started | | - |
| **P2-W010** | Implement KYC status display (pending/verified/rejected) | ❌ Not Started | | - |
| **P2-W011** | Test worker profile creation and editing | ❌ Not Started | | - |

### 2.4 Database (Profiles)

| Task ID | Description | Status | Completion Note | Updated |
|---------|-------------|--------|-----------------|----------|
| **P2-D001** | Create profiles table (base user data) | ❌ Not Started | | - |
| **P2-D002** | Create business_profiles table | ❌ Not Started | | - |
| **P2-D003** | Create worker_profiles table | ❌ Not Started | | - |
| **P2-D004** | Add RLS policies for profiles | ❌ Not Started | | - |
| **P2-D005** | Create indexes for performance | ❌ Not Started | | - |
| **P2-D006** | Seed test data (businesses, workers) | ❌ Not Started | | - |
| **P2-D007** | Test database queries with Supabase Client | ❌ Not Started | | - |
| **P2-D008** | Test RLS policies with different user roles | ❌ Not Started | | - |

---

## Phase 3: Job Management (Business Portal)

**Goal:** Implement job posting, management, and booking features for businesses

| Task ID | Description | Status | Completion Note | Updated |
|---------|-------------|--------|-----------------|----------|
| **P3-J001** | Create job posting form with all fields | ❌ Not Started | | - |
| **P3-J002** | Implement position type dropdown (housekeeping, steward, etc.) | ❌ Not Started | | - |
| **P3-J003** | Add date and time pickers | ❌ Not Started | | - |
| **P3-J004** | Implement area selection (auto-filter workers) | ❌ Not Started | | - |
| **P3-J005** | Add wage rate input (IDR) | ❌ Not Started | | - |
| **P3-J006** | Add "Use Rate Bali" button (auto-fill UMK wage) | ❌ Not Started | | - |
| **P3-J007** | Implement workers needed counter | ❌ Not Started | | - |
| **P3-J008** | Add job requirements multi-select | ❌ Not Started | | - |
| **P3-J009** | Create job description textarea | ❌ Not Started | | - |
| **P3-J010** | Implement save as draft functionality | ❌ Not Started | | - |
| **P3-J011** | Create my jobs list page (business dashboard) | ❌ Not Started | | - |
| **P3-J012** | Add job status badges (draft, open, filled, cancelled) | ❌ Not Started | | - |
| **P3-J013** | Implement job edit functionality | ❌ Not Started | | - |
| **P3-J014** | Implement job delete functionality | ❌ Not Started | | - |
| **P3-J015** | Add job statistics (views, applications) | ❌ Not Started | | - |

### 3.1 Booking Management

| Task ID | Description | Status | Completion Note | Updated |
|---------|-------------|--------|-----------------|----------|
| **P3-B001** | Create bookings management page | ❌ Not Started | | - |
| **P3-B002** | Display incoming worker applications | ❌ Not Started | | - |
| **P3-B003** | Implement worker profile card in applications | ❌ Not Started | | - |
| **P3-B004** | Add reliability score display | ❌ Not Started | | - |
| **P3-B005** | Implement accept/reject functionality | ❌ Not Started | | - |
| **P3-B006** | Add real-time updates (Supabase Realtime) | ❌ Not Started | | - |
| **P3-B007** | Create notification toast for new applications | ❌ Not Started | | - |
| **P3-B008** | Implement booking details view | ❌ Not Started | | - |
| **P3-B009** | Add worker notes field | ❌ Not Started | | - |
| **P3-B010** | Implement bulk actions (accept all, reject all) | ❌ Not Started | | - |

### 3.2 Database (Jobs & Bookings)

| Task ID | Description | Status | Completion Note | Updated |
|---------|-------------|--------|-----------------|----------|
| **P3-D001** | Create jobs table | ❌ Not Started | | - |
| **P3-D002** | Create bookings table | ❌ Not Started | | - |
| **P3-D003** | Add RLS policies for jobs (business only) | ❌ Not Started | | - |
| **P3-D004** | Add RLS policies for bookings (business and worker) | ❌ Not Started | | - |
| **P3-D005** | Create indexes for jobs and bookings | ❌ Not Started | | - |
| **P3-D006** | Create job status enum (draft, open, filled, etc.) | ❌ Not Started | | - |
| **P3-D007** | Create booking status enum (pending, accepted, etc.) | ❌ Not Started | | - |
| **P3-D008** | Seed test data (jobs, bookings) | ❌ Not Started | | - |
| **P3-D009** | Test job creation, booking flow | ❌ Not Started | | - |

---

## Phase 4: Marketplace & Booking (Worker Portal)

**Goal:** Implement job discovery, application, and booking management for workers

| Task ID | Description | Status | Completion Note | Updated |
|---------|-------------|--------|-----------------|----------|
| **P4-M001** | Create marketplace home page | ❌ Not Started | | - |
| **P4-M002** | Implement job listing cards | ❌ Not Started | | - |
| **P4-M003** | Add job search functionality | ❌ Not Started | | - |
| **P4-M004** | Implement filter by position, area, wage | ❌ Not Started | | - |
| **P4-M005** | Add sort by date, wage, distance | ❌ Not Started | | - |
| **P4-M006** | Create job detail page | ❌ Not Started | | - |
| **P4-M007** | Display job requirements and description | ❌ Not Started | | - |
| **P4-M008** | Implement one-tap apply functionality | ❌ Not Started | | - |
| **P4-M009** | Create my bookings page (worker dashboard) | ❌ Not Started | | - |
| **P4-M010** | Display booking status (pending, accepted, rejected) | ❌ Not Started | | - |
| **P4-M011** | Add cancel booking functionality (before acceptance) | ❌ Not Started | | - |
| **P4-M012** | Implement notifications for booking updates | ❌ Not Started | | - |
| **P4-M013** | Create worker discovery page (browse workers) | ❌ Not Started | | - |
| **P4-M014** | Implement worker profile cards with reliability score | ❌ Not Started | | - |
| **P4-M015** | Add skill tag filtering for workers | ❌ Not Started | | - |

### 4.1 Attendance Tracking

| Task ID | Description | Status | Completion Note | Updated |
|---------|-------------|--------|-----------------|----------|
| **P4-A001** | Create QR code generation for check-in | ❌ Not Started | | - |
| **P4-A002** | Implement QR code scanner (camera) | ❌ Not Started | | - |
| **P4-A003** | Add GPS verification (optional) | ❌ Not Started | | - |
| **P4-A004** | Record check-in timestamp | ❌ Not Started | | - |
| **P4-A005** | Record check-out timestamp | ❌ Not Started | | - |
| **P4-A006** | Create attendance history page | ❌ Not Started | | - |
| **P4-A007** | Display attendance rate in worker profile | ❌ Not Started | | - |
| **P4-A008** | Display attendance history in business view | ❌ Not Started | | - |

### 4.2 Database (Attendance)

| Task ID | Description | Status | Completion Note | Updated |
|---------|-------------|--------|-----------------|----------|
| **P4-D001** | Add check_in_time and check_out_time to bookings | ❌ Not Started | | - |
| **P4-D002** | Create attendance history view | ❌ Not Started | | - |
| **P4-D003** | Calculate attendance rate (completed / total) | ❌ Not Started | | - |

---

## Phase 5: Wallet & Payments

**Goal:** Implement wallet system, top-up, payouts, and payment gateway integration

### 5.1 Wallet System

| Task ID | Description | Status | Completion Note | Updated |
|---------|-------------|--------|-----------------|----------|
| **P5-W001** | Create wallets table | ❌ Not Started | | - |
| **P5-W002** | Create wallet dashboard page | ❌ Not Started | | - |
| **P5-W003** | Display current balance | ❌ Not Started | | - |
| **P5-W004** | Display pending balance | ❌ Not Started | | - |
| **P5-W005** | Create transaction history page | ❌ Not Started | | - |
| **P5-W006** | Implement transaction filters (date, type) | ❌ Not Started | | - |
| **P5-W007** | Add transaction details view | ❌ Not Started | | - |
| **P5-W008** | Create wallet RLS policies | ❌ Not Started | | - |
| **P5-W009** | Implement balance update edge function | ❌ Not Started | | - |

### 5.2 Payment Integration (Business - Deposits)

| Task ID | Description | Status | Completion Note | Updated |
|---------|-------------|--------|-----------------|----------|
| **P5-D001** | Set up Xendit/Midtrans account | ❌ Not Started | | - |
| **P5-D002** | Implement QRIS payment form | ❌ Not Started | | - |
| **P5-D003** | Create API route for payment webhook | ❌ Not Started | | - |
| **P5-D004** | Implement payment webhook handler | ❌ Not Started | | - |
| **P5-D005** | Add wallet balance update on payment success | ❌ Not Started | | - |
| **P5-D006** | Create transaction record on payment | ❌ Not Started | | - |
| **P5-D007** | Add minimum top-up amount (Rp 500.000) | ❌ Not Started | | - |
| **P5-D008** | Add payment confirmation page | ❌ Not Started | | - |
| **P5-D009** | Implement payment error handling | ❌ Not Started | | - |
| **P5-D010** | Test payment flow (QRIS) | ❌ Not Started | | - |

### 5.3 Payout Integration (Worker - Withdrawals)

| Task ID | Description | Status | Completion Note | Updated |
|---------|-------------|--------|-----------------|----------|
| **P5-W001** | Create withdrawal request form | ❌ Not Started | | - |
| **P5-W002** | Implement bank details input (BRI, Mandiri, BCA, BNI) | ❌ Not Started | | - |
| **P5-W003** | Add minimum withdrawal amount (Rp 100.000) | ❌ Not Started | | - |
| **P5-W004** | Implement 1 free withdrawal per week rule | ❌ Not Started | | - |
| **P5-W005** | Add fee for extra withdrawals | ❌ Not Started | | - |
| **P5-W006** | Create API route for payout webhook | ❌ Not Started | | - |
| **P5-W007** | Implement payout webhook handler | ❌ Not Started | | - |
| **P5-W008** | Add wallet balance deduction on payout | ❌ Not Started | | - |
| **P5-W009** | Create transaction record on payout | ❌ Not Started | | - |
| **P5-W010** | Implement payout status tracking (pending, processing, completed) | ❌ Not Started | | - |
| **P5-W011** | Test payout flow (disbursement) | ❌ Not Started | | - |

### 5.4 Database (Wallets & Transactions)

| Task ID | Description | Status | Completion Note | Updated |
|---------|-------------|--------|-----------------|----------|
| **P5-D001** | Create wallets table | ❌ Not Started | | - |
| **P5-D002** | Create transactions table | ❌ Not Started | | - |
| **P5-D003** | Add RLS policies for wallets and transactions | ❌ Not Started | | - |
| **P5-D004** | Create indexes for transactions | ❌ Not Started | | - |
| **P5-D005** | Seed test data (wallets, transactions) | ❌ Not Started | | - |

---

## Phase 6: Compliance & Reliability

**Goal:** Implement PP 35/2021 compliance guard, reliability scoring, and review system

### 6.1 Reliability Score

| Task ID | Description | Status | Completion Note | Updated |
|---------|-------------|--------|-----------------|----------|
| **P6-R001** | Create reliability score edge function | ❌ Not Started | | - |
| **P6-R002** | Implement attendance rate calculation | ❌ Not Started | | - |
| **P6-R003** | Implement punctuality rate calculation | ❌ Not Started | | - |
| **P6-R004** | Implement average rating calculation | ❌ Not Started | | - |
| **P6-R005** | Create weighted score formula | ❌ Not Started | | - |
| **P6-R006** | Add score to worker_profiles table | ❌ Not Started | | - |
| **P6-R007** | Create reliability badge component (1-5 stars) | ❌ Not Started | | - |
| **P6-R008** | Display reliability score in worker profile | ❌ Not Started | | - |
| **P6-R009** | Display reliability score in business view | ❌ Not Started | | - |
| **P6-R010** | Test reliability score calculation | ❌ Not Started | | - |

### 6.2 Compliance Guard (21-Day Limit)

| Task ID | Description | Status | Completion Note | Updated |
|---------|-------------|--------|-----------------|----------|
| **P6-C001** | Create compliance_records table | ❌ Not Started | | - |
| **P6-C002** | Implement compliance guard edge function | ❌ Not Started | | - |
| **P6-C003** | Track days worked per business-worker pairing per month | ❌ Not Started | | - |
| **P6-C004** | Send warning at day 15-18 | ❌ Not Started | | - |
| **P6-C005** | Block booking at day 21 | ❌ Not Started | | - |
| **P6-C006** | Create compliance warning component | ❌ Not Started | | - |
| **P6-C007** | Display compliance status in business dashboard | ❌ Not Started | | - |
| **P6-C008** | Suggest alternative workers when blocked | ❌ Not Started | | - |
| **P6-C009** | Test compliance guard (simulate 21-day limit) | ❌ Not Started | | - |

### 6.3 Review System

| Task ID | Description | Status | Completion Note | Updated |
|---------|-------------|--------|-----------------|----------|
| **P6-R001** | Create reviews table | ❌ Not Started | | - |
| **P6-R002** | Implement review submission form (after job completion) | ❌ Not Started | | - |
| **P6-R003** | Add rating (1-5 stars) input | ❌ Not Started | | - |
| **P6-R004** | Add comment text area | ❌ Not Started | | - |
| **P6-R005** | Add "Would rehire" checkbox | ❌ Not Started | | - |
| **P6-R006** | Create review display component | ❌ Not Started | | - |
| **P6-R007** | Display reviews in worker profile | ❌ Not Started | | - |
| **P6-R008** | Display reviews in business view | ❌ Not Started | | - |
| **P6-R009** | Calculate average rating for worker | ❌ Not Started | | - |
| **P6-R010** | Test review submission and display | ❌ Not Started | | - |

---

## Future Phases (Post-MVP)

### Phase 7: Launch Preparation

- [ ] Load testing with 1,000+ concurrent users
- [ ] Security audit and penetration testing
- [ ] Performance optimization (Lighthouse score > 90)
- [ ] Create landing page
- [ ] Create onboarding flow
- [ ] Create help center and documentation
- [ ] Set up production monitoring (Sentry, PostHog)

### Phase 8: Growth Features

- [ ] Tips system (businesses can tip workers)
- [ ] Skill badges and certifications
- [ ] Referral program (invite workers, earn bonuses)
- [ ] Advanced analytics dashboard
- [ ] Community forum and discussion board
- [ ] Mobile PWA (Progressive Web App)

### Phase 9: Advanced Features

- [ ] AI matching algorithm (worker-job recommendations)
- [ ] Multi-platform integration (auto-post to Instagram/Facebook)
- [ ] Seasonal optimization (dynamic pricing)
- [ ] Live chat system (in-app messaging)
- [ ] Two-way review system (workers review businesses)

---

## Task Completion Criteria

Before marking any task as complete, ensure:

- [ ] Code is formatted (Prettier)
- [ ] No linting errors (ESLint)
- [ ] No TypeScript errors
- [ ] Component/page renders without console errors
- [ ] Responsive on mobile (320px+) and desktop (1920px+)
- [ ] Accessibility checked (keyboard navigation, ARIA labels)
- [ ] Error handling implemented for user actions
- [ ] Loading states displayed for async operations
- [ ] **Plan.md updated** with completion note ✅

---

## Quick Reference

### Status Legend

- ❌ **Not Started** - Task hasn't been begun
- 🔄 **In Progress** - Task is currently being worked on
- ⏸️ **Blocked** - Task is waiting on dependency
- ✅ **Completed** - Task is done and tested
- ⏭️ **Deferred** - Task moved to later phase

### Priority Levels

- **P0** - Launch blocking (must complete for MVP)
- **P1** - High priority (important for UX)
- **P2** - Medium priority (nice to have)
- **P3** - Low priority (future enhancement)

---

**Document Owner:** Sasha (AI Co-founder)
**Last Review:** February 21, 2026
**Next Review:** Weekly (every Monday)
