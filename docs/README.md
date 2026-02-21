# Daily Worker Hub Documentation

Official documentation repository for **Daily Worker Hub** - Web MVP.

## Project Overview

> "Daily Worker Hub is a **community-first platform** connecting Bali's hospitality businesses with reliable daily workers, built on **trust, transparency, and compliance** — not just another job board."

### Tech Stack

| Component | Technology |
|-----------|-------------|
| **Frontend** | Next.js 14 + TypeScript |
| **Backend** | Supabase Local (Self-hosted via Docker on VPS) |
| **Infrastructure** | VPS (DigitalOcean) + Hostinger MCP (DNS) |
| **Database** | PostgreSQL (Supabase Local) |
| **Authentication** | Supabase Auth (Email + Google OAuth) |
| **Styling** | Tailwind CSS + shadcn/ui |
| **State Management** | TanStack Query + Zustand |
| **Validation** | Zod |
| **Payments** | Xendit / Midtrans (QRIS + Bank Payouts) |

### Documentation Structure

| File | Description | Status |
|------|-------------|--------|
| **PRD.md** | Product Requirements Document (User Stories, Features, Out of Scope) | ✅ Complete |
| **Architecture.md** | System Architecture, Database Schema (16 tables), Data Flow, Deployment | ✅ Complete |
| **AI_Rules.md** | Coding Standards, Naming Conventions, Error Handling Guidelines | ✅ Complete |
| **Plan.md** | Development Roadmap (12 Phases, 150+ Tasks) | ✅ Complete |
| **SECURITY.md** | Security & Compliance (Authentication, Data Protection, API Security, Payment Security, PKHL Compliance, Data Privacy) | ✅ Complete |
| **OPERATIONS.md** | Operational Plan (Team Structure, Infrastructure, Cost Projections) | ✅ Complete |
| **business-model.md** | Financial Analysis, UMK Bali, Compliance (PP 35/2021) | ✅ Complete |
| **matching-algorithm.md** | Worker-Job Matching Algorithm | ✅ Complete |
| **analysis-bali-competitor-deep-dive.md** | Competitor Analysis (@balijobs, FB Groups, etc.) | ✅ Complete |
| **analysis-bali-daily-worker-social-media.md** | Social Media Recruitment Trends | ✅ Complete |
| **whitepaper.md** | Project Whitepaper | ✅ Complete |
| **README.md** | This file | ✅ Complete |

### Setup & Deployment

See `Setup.md` and `Architecture.md` for detailed setup instructions:

1. **VPS Setup** (Ubuntu 22.04)
   - Install Docker, Nginx, Node.js, PM2
   - Set up Let's Encrypt SSL

2. **Supabase Local**
   - Initialize via `supabase init`
   - Start with `supabase start`
   - Access Studio at `http://localhost:8000`

3. **Next.js App**
   - Install dependencies: `npm install`
   - Configure `.env.local`
   - Build and start: `npm run build && npm start`
   - Use PM2: `pm2 start npm --name "daily-worker-hub"`

4. **Hostinger MCP (DNS)**
   - Configure A record: `dailyworkerhub.com → [VPS-IP]`
   - Wait for DNS propagation (15-30 minutes)

5. **Nginx Configuration**
   - Reverse proxy to Next.js (port 3000)
   - Reverse proxy to Supabase Studio (port 8000)
   - SSL termination via Let's Encrypt

### Development Workflow

1. **Read Plan.md first** - Always check `Plan.md` before starting work
2. **Read relevant files** - Read PRD.md and Architecture.md if unsure
3. **Follow AI_Rules.md** - Coding standards, naming conventions, error handling
4. **Update Plan.md after each task** - MANDATORY: Check off task, add completion note
5. **Commit changes** - Follow commit message conventions (feat:, fix:, refactor:, docs:)

### Branch Strategy

| Branch | Purpose |
|--------|---------|
| `main` | Production code |
| `develop` | Development work |
| `feature/*` | Feature branches (e.g., `feature/job-posting`) |
| `bugfix/*` | Bug fixes (e.g., `bugfix/payment-error`) |

### Commit Message Conventions

Follow [Conventional Commits](https://www.conventionalcommits.org/):

| Type | Description | Examples |
|------|-------------|----------|
| `feat` | New feature | `feat(job-posting): add job form validation` |
| `fix` | Bug fix | `fix(wallet): resolve balance calculation error` |
| `refactor` | Code improvement without feature change | `refactor(auth): simplify user session logic` |
| `style` | Code style changes (formatting, missing semicolons) | `style(components): format with Prettier` |
| `docs` | Documentation changes | `docs(readme): update architecture section` |
| `test` | Adding or updating tests | `test(job-form): add unit tests for validation` |
| `chore` | Maintenance tasks, updates to build process | `chore(deps): update dependencies` |

### Contributing Guidelines

1. **Code Style**
   - Follow TypeScript strict mode
   - Use Prettier for formatting (2 spaces, single quotes)
   - No `any` types without explicit reason

2. **Components**
   - Build reusable UI components
   - Don't repeat yourself (DRY)
   - Use shadcn/ui components first

3. **Error Handling**
   - Always validate user input (Zod)
   - Use try-catch wrappers
   - Display user-friendly error messages (toasts)

4. **Performance**
   - Optimize for Core Web Vitals
   - Lazy load heavy components
   - Use code splitting (automatic in Next.js 14)

### Security

- **Never trust user input** - Validate everything
- **Use RLS policies** - Database-level access control
- **Environment variables** - Never commit `.env.local`
- **SQL Injection** - Use parameterized queries (Supabase handles this)
- **XSS Prevention** - Sanitize HTML before rendering

### Testing

| Type | Tool | Status |
|------|------|--------|
| Unit Testing | Jest + React Testing Library | 📋 Planned |
| Integration Testing | Supabase Test Utils | 📋 Planned |
| E2E Testing | Playwright | 📋 Planned |

### Deployment

- **VPS** - DigitalOcean (4GB RAM, 2 vCPUs)
- **Domain** - dailyworkerhub.com (via Hostinger MCP)
- **SSL** - Let's Encrypt (via Certbot)
- **Process Manager** - PM2

### Cost Analysis

| Component | Monthly Cost | Annual Cost |
|-----------|--------------|-------------|
| **VPS (DigitalOcean)** | $24.00 | $288.00 |
| **Domain (Hostinger)** | ~$10.00 | ~$120.00 |
| **SSL (Let's Encrypt)** | $0.00 | $0.00 |
| **Total** | **~$34.00** | **~$408.00** |

### Support

- **Documentation** - See files in this repository
- **Issues** - Open an issue on GitHub
- **Discussions** - Use GitHub Discussions for questions

### License

Proprietary - All Rights Reserved

---

**Project:** Daily Worker Hub
**Founders:** Abdurrahman Firdaus David & Sasha (AI Co-founder)
**Last Updated:** February 21, 2026
