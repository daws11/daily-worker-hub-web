# Incident Response - Daily Worker Hub

> How to detect, respond to, and recover from subsystem outages.

**Project:** Daily Worker Hub - Web MVP
**Tech Stack:** Next.js + Vercel + Supabase Cloud + Xendit + Upstash Redis
**Version:** 1.0
**Last Updated:** April 2026

---

## Table of Contents

1. [How Incidents Are Detected](#1-how-incidents-are-detected)
2. [Severity Levels](#2-severity-levels)
3. [Supabase Database Outage](#3-supabase-database-outage)
4. [Supabase Auth Outage](#4-supabase-auth-outage)
5. [Xendit Payment API Outage](#5-xendit-payment-api-outage)
6. [Upstash Redis Outage](#6-upstash-redis-outage)
7. [Simultaneous Multi-Subsystem Outage](#7-simultaneous-multi-subsystem-outage)
8. [Escalation Path](#8-escalation-path)
9. [Communication Templates](#9-communication-templates)
10. [Post-Incident Review](#10-post-incident-review)

---

## 1. How Incidents Are Detected

Incidents are detected through two independent monitoring channels:

| Channel | Frequency | Trigger | Action |
|---------|-----------|---------|--------|
| **Better Stack Uptime Monitor** | Every 60s | `GET /api/health` returns non-200 | Alert via Better Stack (configured in dashboard) |
| **Internal Health Check Cron** | Every 5 min (`*/5 * * * *`) | `POST /api/cron/health-check` detects failure | POST to Better Stack Heartbeat API + email to `ALERT_EMAIL` via Resend |

### Health Endpoint Response Reference

| Condition | HTTP Status | `status` field |
|-----------|-------------|----------------|
| All services healthy | `200` | `"ok"` |
| Supabase DB or auth or Xendit down | `503` | `"unhealthy"` |
| Redis down (critical services OK) | `200` | `"degraded"` |

### Accessing Diagnostic Data

```bash
# Lightweight status (for monitoring agents)
curl https://dailyworkerhub.com/api/health

# Full diagnostic payload (for debugging)
curl https://dailyworkerhub.com/api/health/detailed

# Public status page (for users)
# https://dailyworkerhub.com/status
```

---

## 2. Severity Levels

| Level | Name | Definition | Response Time | Example |
|-------|------|------------|---------------|---------|
| **SEV-1** | Critical | All or most users cannot complete core workflows | Immediate (< 15 min) | Supabase DB down, Supabase auth down, Xendit down |
| **SEV-2** | High | Core workflows impaired; subset of users affected | < 30 min | Auth intermittently failing, Xendit slow |
| **SEV-3** | Medium | Non-critical features degraded; no direct user impact | < 2 hours | Redis down (app continues without cache) |
| **SEV-4** | Low | Informational; monitoring-only | Next business day | Health check anomalies, latency spikes |

---

## 3. Supabase Database Outage

### Symptoms

- `GET /api/health` returns `503` with `services.supabase.database.status: "unavailable"`
- `GET /api/health/detailed` shows `checks.supabase.database.error` with the failure reason
- Users report "app is down" or "cannot load jobs"
- Better Stack sends an alert (if `BETTERSTACK_HEARTBEAT_URL` is configured)
- Email sent to `ALERT_EMAIL` (if `RESEND_API_KEY` is configured)

### Immediate Investigation Steps

**Step 1: Confirm the outage**

```bash
curl https://dailyworkerhub.com/api/health/detailed
# Look for: services.supabase.database.status === "unavailable"
```

**Step 2: Check Supabase status page**

Visit [status.supabase.com](https://status.supabase.com) and look for any active incidents affecting the project region.

**Step 3: Verify credentials are not expired**

Check `.env.local` for:
- `NEXT_PUBLIC_SUPABASE_URL` — still pointing to the correct project
- `SUPABASE_SERVICE_ROLE_KEY` — key not revoked or rotated

```bash
# Quick credential check — this is a health check, not a full test
curl https://<project-ref>.supabase.co/auth/v1/health \
  -H "apikey: <anon-key>" \
  -H "Authorization: Bearer <anon-key>"
```

**Step 4: Check Vercel deployment status**

If a recent deployment was made, a rolling restart may cause temporary unavailability. Look for the `X-Vercel-Deployment-URL` header in responses — the cron job skips alerting during deployments for this reason.

**Step 5: Check Vercel logs**

In the Vercel dashboard, navigate to **Functions** → filter by `api/health` — look for repeated 500/503 errors.

### User Communication

For SEV-1 incidents lasting more than 10 minutes, post an update to the status page immediately. See [Communication Templates](#9-communication-templates).

### Recovery

1. If Supabase has an active incident — wait for their resolution and monitor. Supabase SLA depends on plan tier.
2. If credentials were rotated — update `SUPABASE_SERVICE_ROLE_KEY` in Vercel Environment Variables and redeploy if necessary.
3. If the outage is a false positive (e.g., deployment in progress) — no action needed; monitoring will resume automatically.
4. Once `GET /api/health` returns `200` with `"ok"` — verify via the status page at `/status`.

### Supabase SLA Reference

| Plan | Database SLA | Auth SLA |
|------|-------------|---------|
| Free | No SLA | No SLA |
| Pro | 99.9% uptime | 99.9% uptime |
| Team | 99.95% uptime | 99.95% uptime |
| Enterprise | Custom | Custom |

File a Supabase support ticket via the [Supabase Dashboard](https://supabase.com/dashboard) if the outage exceeds 5 minutes and no Supabase status incident is posted.

---

## 4. Supabase Auth Outage

### Symptoms

- `GET /api/health` returns `503` with `services.supabase.auth.status: "unavailable"`
- Users cannot log in, sign up, or refresh their session
- Existing logged-in users may be unexpectedly logged out
- `GET /auth/v1/health` returns non-2xx

### Immediate Investigation Steps

**Step 1: Confirm the outage**

```bash
curl https://dailyworkerhub.com/api/health/detailed
# Look for: services.supabase.auth.status === "unavailable"
```

**Step 2: Check Supabase auth health endpoint directly**

```bash
curl https://<project-ref>.supabase.co/auth/v1/health \
  -H "apikey: <anon-key>" \
  -H "Authorization: Bearer <anon-key>"
# Expected: {"status":"ok"} or {"status":"healthy"}
```

**Step 3: Check Supabase status page**

Visit [status.supabase.com](https://status.supabase.com) — Auth failures are listed separately from Database failures.

**Step 4: Verify JWT configuration**

Auth failures can occur if:
- `NEXT_PUBLIC_SUPABASE_URL` changed (project reference mismatch)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` was rotated
- Supabase project was migrated to a different region

Check these in `.env.local` and Vercel Environment Variables.

### Recovery

1. If Supabase has an active auth incident — wait for resolution. Auth and database are separate components.
2. If keys were rotated — update `NEXT_PUBLIC_SUPABASE_ANON_KEY` in Vercel Environment Variables. The Next.js app will pick up the new key on the next request.
3. If the outage is due to a misconfigured region migration — re-check `NEXT_PUBLIC_SUPABASE_URL`.
4. Once `GET /api/health` returns `200` — verify via `/status`.

### User Impact

During an auth outage:
- New users **cannot sign up**
- Existing users **cannot log in**
- Users with active sessions **can still use the app** (until their JWT expires, typically 1 hour)
- Jobs, bookings, and payments that are **already in progress continue normally**

---

## 5. Xendit Payment API Outage

### Symptoms

- `GET /api/health` returns `503` with `services.xendit.status: "unavailable"`
- `GET /api/health/detailed` shows the error from Xendit's balance endpoint
- Users attempting to top up wallet or pay for bookings see payment failures
- Existing successful payments are **not affected**

### Immediate Investigation Steps

**Step 1: Confirm the outage**

```bash
curl https://dailyworkerhub.com/api/health/detailed
# Look for: services.xendit.status === "unavailable"
```

**Step 2: Check Xendit status page**

Visit [status.xendit.co](https://status.xendit.co) or search for "Xendit status" — Xendit does not always have a public status page for all API services, so also check:

```bash
# Manually test Xendit balance endpoint (as the health check does)
curl https://api.xendit.co/balance \
  -H "Authorization: Basic $(echo -n '<XENDIT_SECRET_KEY>:' | base64)" \
  --max-time 5
```

**Step 3: Verify Xendit credentials**

Check `.env.local`:
- `XENDIT_SECRET_KEY` — still valid
- `XENDIT_API_URL` — still `https://api.xendit.co` (not a sandbox URL)

```bash
# Test with the correct key format (as done in lib/payments/xendit.ts)
curl https://api.xendit.co/balance \
  -u "<XENDIT_SECRET_KEY>:" \
  --max-time 5
```

**Step 4: Check for account restrictions**

Xendit may restrict API access due to:
- Account suspension or verification issues
- Exceeded transaction limits
- Compliance holds

Log in to the [Xendit Dashboard](https://dashboard.xendit.co) to check for any account-level issues.

### User Communication

See [Communication Templates](#9-communication-templates). Key messaging:
- Wallet balances are **safe**
- Existing bookings with successful payments are **not affected**
- New payments are temporarily unavailable

### Recovery

1. If Xendit has an API incident — wait for resolution. Payment processing will resume automatically when the API recovers.
2. If the `XENDIT_SECRET_KEY` was rotated — update `XENDIT_SECRET_KEY` in Vercel Environment Variables.
3. If account restrictions are suspected — contact Xendit support immediately via the Dashboard.
4. Once `GET /api/health` returns `200` — verify via `/status`.

### Xendit SLA Reference

Xendit does not publish a public SLA document for their API. Based on historical uptime, Xendit typically achieves >99.9% API availability. For enterprise support, contact your Xendit account manager.

---

## 6. Upstash Redis Outage

### Symptoms

- `GET /api/health` returns `200` with `services.redis.status: "unavailable"` and `status: "degraded"`
- The app continues to function — Redis is used for caching and rate limiting, not core data
- Some features may be slower (cached data is not served)
- Rate limiting may be less effective (open requests go directly to DB)

### Immediate Investigation Steps

**Step 1: Confirm the outage**

```bash
curl https://dailyworkerhub.com/api/health/detailed
# Look for: services.redis.status === "unavailable"
# Overall status will be "degraded" (not "unhealthy")
```

**Step 2: Verify Upstash credentials**

Check `.env.local`:
- `UPSTASH_REDIS_REST_URL` — correct URL for the Upstash console
- `UPSTASH_REDIS_REST_TOKEN` — token not revoked

```bash
# Manually test Redis PING
curl -X POST https://<upstash-redis-url>/ \
  -H "Authorization: Bearer <upstash-redis-token>" \
  -H "Content-Type: application/json" \
  -d '{"command":"PING"}' \
  --max-time 5
```

**Step 3: Check Upstash console**

Log in to the [Upstash Console](https://console.upstash.com) to:
- Verify the database is not paused (Upstash free tier pauses after 14 days of inactivity)
- Check if there are rate limit errors in the console
- Verify the correct database is linked (check the REST URL)

### Recovery

1. If Upstash database was paused (common on free tier after inactivity) — resume it from the Upstash Console. The app will reconnect automatically.
2. If credentials were rotated — update `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in Vercel Environment Variables.
3. Once `GET /api/health` returns `200` with `status: "ok"` — verify via `/status`.

### Impact Assessment

| Feature | Impact When Redis Down |
|---------|----------------------|
| Job listings | Slower (no cache) |
| Rate limiting | Less effective |
| Session caching | Falls back to DB |
| Worker availability cache | Falls back to DB |
| Core user flows (login, bookings) | **No impact** (these use DB, not Redis) |

> **Note:** Redis downtime is intentionally classified as `degraded` rather than `unhealthy`. The app is designed to fall back gracefully. Alert only if Redis is down for more than 1 hour or if rate limiting abuse is observed.

---

## 7. Simultaneous Multi-Subsystem Outage

### Symptoms

- `GET /api/health` returns `503` with multiple `unavailable` services
- Multiple alerts arrive simultaneously (Better Stack + email)
- Users experience complete site unavailability

### Immediate Investigation Steps

**Step 1: Determine the primary cause**

In most cases, one subsystem failure causes cascading effects. Identify the root cause first:

```
Supabase DB down → Xendit health check may still pass (independent)
Supabase auth down → App may partially work (logged-in users)
Xendit down → App works, payments fail
Redis down → App works, cache disabled
```

**Step 2: Prioritize restoration in this order:**

1. **Supabase Database** — root cause of most cascading failures
2. **Supabase Auth** — blocks all login/signup flows
3. **Xendit** — payment processing
4. **Redis** — lowest priority (graceful degradation)

**Step 3: Avoid false escalation**

During a Supabase incident, Xendit and Redis checks may also fail due to:
- Request timeouts overwhelming the app server
- Connection pool exhaustion
- Network routing issues affecting multiple services

Focus on restoring the primary service. Other services typically recover automatically.

**Step 4: Document all simultaneous failures**

Record all services that went down, the timestamps, and the order of recovery. This is critical for the post-incident review.

---

## 8. Escalation Path

### Primary On-Call

| Role | Responsibility |
|------|---------------|
| **Tech Lead (David)** | First responder for all SEV-1 and SEV-2 incidents. Coordinates investigation and communication. |
| **AI Co-founder (Sasha)** | Secondary on-call. Assists with debugging and post-incident documentation. |

### Escalation Matrix

| Severity | Initial Response | Escalation After | External Contact |
|----------|-----------------|-----------------|-----------------|
| **SEV-1** | Immediately page David via Slack/phone | 15 minutes without resolution → contact David directly | Supabase support, Xendit support |
| **SEV-2** | David notified via alert | 30 minutes without progress → escalate to Sasha | Supabase support if DB/auth |
| **SEV-3** | David notified via alert | 2 hours without progress → escalate | Upstash support if DB pause suspected |
| **SEV-4** | Monitor only | No escalation required | — |

### External Support Contacts

| Service | Support Channel | SLA |
|---------|----------------|-----|
| **Supabase** | [Dashboard Support](https://supabase.com/dashboard) or [support@supabase.io](mailto:support@supabase.io) | Pro+: 4-hour response |
| **Xendit** | [Dashboard Support](https://dashboard.xendit.co) or account manager | Business: 4-hour response |
| **Upstash** | [Console Support](https://console.upstash.com) or [support@upstash.com](mailto:support@upstash.com) | Free: Community forum; Plus: Email |
| **Vercel** | [Dashboard Support](https://vercel.com/dashboard) | Pro+: Priority support |
| **Better Stack** | [Dashboard Alerts](https://betterstack.com/dashboard) | Email-based |

### Better Stack Alert Configuration

Better Stack monitors are configured in the [Better Stack Dashboard](https://betterstack.com/dashboard):

- **Uptime Monitor**: Polls `GET /api/health` every 60 seconds. A non-200 response triggers a notification to configured channels (email, Slack, SMS).
- **Heartbeat Monitor**: Expects `POST /api/cron/health-check` every 5 minutes. If the cron misses a heartbeat, Better Stack alerts. This is a secondary path independent of the uptime monitor.

To update alert contacts:
1. Log in to [Better Stack](https://betterstack.com/dashboard)
2. Navigate to **Monitors** → select the relevant monitor
3. Update **Notification Channels** (email, Slack, PagerDuty, etc.)

---

## 9. Communication Templates

### Template A: SEV-1 — Critical Outage Detected

```
Subject: [SEV-1] Daily Worker Hub — Critical Outage: {SUBSYSTEM}

Status: Investigating
Start Time: {TIMESTAMP}
Affected: {SUBSYSTEM} — {IMPACT_DESCRIPTION}

We have detected a critical outage affecting {SUBSYSTEM}.
The engineering team is investigating and will provide an update within 15 minutes.

What we know:
- {SUBSYSTEM} has been unavailable since approximately {TIME}
- Impact: {SPECIFIC_USER_IMPACT}

Next update: Within 15 minutes.
```

### Template B: SEV-1 — Resolution

```
Subject: [RESOLVED] Daily Worker Hub — {SUBSYSTEM} Outage Resolved

Status: Resolved
Start Time: {TIMESTAMP}
Duration: {DURATION}
Affected: {SUBSYSTEM}

The {SUBSYSTEM} outage has been resolved as of {RESOLUTION_TIME}.
All systems are now operational.

Summary:
- Root cause: {BRIEF_CAUSE}
- Action taken: {WHAT_WAS_DONE}
- Duration: {DURATION}

A post-incident review will be conducted within 48 hours.
```

### Template C: SEV-3 — Degraded Service (Redis)

```
Subject: [SEV-3] Daily Worker Hub — Minor Degradation: Redis Unavailable

Status: Monitoring
Affected: Redis (cache layer)

We are experiencing elevated latency due to Redis being temporarily unavailable.
Core application functionality (login, bookings, payments) is NOT affected.

Impact:
- Job listings may load slightly slower (no cache)
- Rate limiting may be less effective

The engineering team is monitoring the situation. No user action is required.
```

### Template D: Status Page Update (for `/status`)

Post to the status page and any user-facing channels:

```
# {SUBSYSTEM} Incident — {TIMESTAMP}

**Status:** {Investigating / Identified / Monitoring / Resolved}

We are currently experiencing an issue with {SUBSYSTEM}.
{ONE_SENTENCE_DESCRIPTION_OF_IMPACT}.

**What this means for you:**
- {HOW_IT_AFFECTS_USERS}
- {WHAT_IS_STILL_WORKING}

Next update: {TIME}

We apologize for the inconvenience.
```

---

## 10. Post-Incident Review

Every SEV-1 and SEV-2 incident requires a post-incident review (PIR) within **48 hours** of resolution.

### PIR Template

```markdown
## Post-Incident Review: {INCIDENT_NAME}

**Date:** {DATE}
**Duration:** {START} → {END} ({DURATION})
**Severity:** {SEV-1 / SEV-2}
**Author:** {NAME}

### Summary

{2-3 sentence description of what happened and its impact.}

### Timeline

| Time | Event |
|------|-------|
| {HH:MM} | Alert received / incident detected |
| {HH:MM} | Investigation started |
| {HH:MM} | Root cause identified |
| {HH:MM} | Fix deployed |
| {HH:MM} | Confirmed resolved |

### Root Cause

{Detailed explanation of what caused the incident.}

### Contributing Factors

- {FACTOR_1}
- {FACTOR_2}

### Impact

| Metric | Value |
|--------|-------|
| Duration | {DURATION} |
| Users affected | {APPROXIMATE_NUMBER} |
| Transactions affected | {NUMBER} |

### Resolution

{What was done to fix the issue and restore service.}

### Action Items

| Action | Owner | Due Date |
|--------|-------|---------|
| {ACTION_DESCRIPTION} | {NAME} | {DATE} |
| {ACTION_DESCRIPTION} | {NAME} | {DATE} |

### Lessons Learned

{What went well, what could be improved, and any preventive measures to put in place.}
```

### PIR Storage

Store completed PIRs in: `.auto-claude/incident-reviews/` as `{YYYY-MM-DD}-{short-description}.md`

---

## Quick Reference Card

```
┌─────────────────────────────────────────────────────────────┐
│  INCIDENT QUICK REF                                         │
├──────────────────┬──────────────────────────────────────────┤
│ SEV-1 (DB/Auth)  │ Check Supabase status → Wait/Support     │
│ SEV-1 (Xendit)   │ Check Xendit status → Wait/Support        │
│ SEV-2            │ Investigate → Escalate after 30 min      │
│ SEV-3 (Redis)    │ Check Upstash console → Resume DB if paused│
│ Multi-subsystem  │ Fix DB first → others recover automatically│
├──────────────────┴──────────────────────────────────────────┤
│ Monitor: https://dailyworkerhub.com/status                  │
│ Health:  https://dailyworkerhub.com/api/health/detailed     │
│ Better Stack: https://betterstack.com/dashboard             │
│ Supabase: https://supabase.com/dashboard                    │
│ Xendit:   https://dashboard.xendit.co                      │
│ Upstash:  https://console.upstash.com                       │
└─────────────────────────────────────────────────────────────┘
```
