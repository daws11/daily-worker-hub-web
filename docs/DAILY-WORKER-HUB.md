# Daily Worker Hub - Startup Notes

**Project:** Daily Worker Hub
**Platform:** Web platform (Next.js + Supabase)
**Location:** Bali, Indonesia
**Founders:** David + Sasha (AI co-founder)

## Mission

Menghubungkan bisnis hospitality di Bali dengan pekerja harian profesional secara praktis dan fleksibel.

## Target Users

**Businesses:**
- Hotels, villas, restaurants
- Need daily workers: drivers, cleaners, stewards, cooks, dll.
- Need flexibility: peak season, events, staff shortages

**Workers:**
- Professional daily workers in Bali
- Want flexible jobs
- Reliable income from multiple sources

## Tech Stack

**Frontend:**
- Next.js 14 + TypeScript
- Tailwind CSS + shadcn/ui
- TanStack Query (server state)
- Zustand (client state)
- Zod (validation)

**Backend:**
- Supabase Local (self-hosted via Docker)
- PostgreSQL 15+
- Supabase Auth (JWT, Google OAuth)
- Supabase Realtime (WebSockets)
- Supabase Storage (S3-compatible)
- Supabase Edge Functions (Deno-based)

**Infrastructure:**
- VPS (DigitalOcean/Contabo) - Ubuntu 22.04
- Hostinger MCP (DNS management)
- Nginx (reverse proxy)
- PM2 (process manager)
- Let's Encrypt (SSL)

**Cost:**
- VPS: $24/month
- Domain: ~$10/month
- Total: ~$34/month (save ~$16 vs Supabase Pro)

## Development Progress

**Repo:** https://github.com/daws11/daily-worker-hub-web

**Documentation Status:** ✅ Complete (Feb 21, 2026)
- PRD.md - User Stories, Features, Out of Scope
- Architecture.md - Database Schema, Data Flow, Deployment
- AI_Rules.md - Coding Standards, Naming Conventions
- Plan.md - Roadmap 6 Phases (100+ tasks)
- Business model, Competitor analysis, Whitepaper

**Project Phase:** Phase 1: Setup & Infrastructure (0% complete)

## Current Focus

**Immediate Next Steps:**
1. Initialize Next.js 14 project with TypeScript
2. Setup Supabase Local (VPS)
3. Configure Tailwind CSS + shadcn/ui
4. Setup ESLint + Prettier
5. Create folder structure (app/, components/, lib/)

**Key Business Metrics (MVP Targets):**
- 50 businesses, 500 workers in 3 months
- 1,000+ transactions/month
- 0 PP 35/2021 compliance violations
- 99.5% uptime

**Core Values:**
- Community First (bukan sekadar marketplace)
- Compliance (PP 35/2021, UMK Bali)
- Transparency (skill, rating, jarak, compliance)
- Fair Wages (Rate Bali based on UMK)
- Empowerment (edukasi hak pekerja, pelatihan skill)

## Notes

- Use Bahasa Indonesia for communication with David
- Casual style, co-founder vibe
- UTC+8 timezone
