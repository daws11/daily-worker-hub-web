# Sentry Alerting & Severity Tiers

> **Related:** See [sentry-setup.md](./sentry-setup.md) for the core Sentry configuration guide.

This document defines the severity classification system, alert thresholds, notification routing, ownership rules, and SLA mapping for all Sentry alerts at Daily Worker Hub.

---

## Severity Tiers

### Overview

Every alert in Sentry is assigned one of four severity tiers (P0–P3). The tier determines the response time, escalation path, and notification channels.

| Tier | Name             | Description                                                                 | Response Time |
| ---- | ---------------- | --------------------------------------------------------------------------- | ------------- |
| P0   | **Critical**     | Service down, payment failures, auth bypass, data loss risk                | **15 minutes** |
| P1   | **High**         | Core feature broken, elevated error rate, performance degradation           | **1 hour**     |
| P2   | **Medium**       | Non-critical feature impacted, cosmetic errors, recoverable issues           | **4 hours**    |
| P3   | **Low**          | Warnings, degraded performance, minor regressions, non-user-facing issues  | **Next business day** |

---

### P0 — Critical

**Definition:** An active incident causing or about to cause complete service disruption, financial loss, or data integrity risk. Immediate human intervention is required.

**Examples:**

- Application is returning HTTP 500 for all requests (complete outage)
- Payment processing failures — money debited from user but not credited to worker wallet
- Authentication bypass — unauthenticated users accessing private data
- Database connection exhausted — all API routes timing out
- Sentry has not received heartbeats for 5+ minutes

**SLA:** Acknowledge within **15 minutes**, resolve within **2 hours**.

---

### P1 — High

**Definition:** A core platform feature is broken or significantly degraded for a meaningful portion of users. Revenue or user trust is at risk if not resolved promptly.

**Examples:**

- Job listing creation failing for >10% of businesses
- Booking confirmation emails not being sent
- Worker wallet withdrawals stuck in "pending" for >30 minutes
- API p95 latency exceeding 2,000ms for more than 10 minutes
- Error rate > 2% for more than 5 minutes

**SLA:** Acknowledge within **1 hour**, resolve within **4 hours**.

---

### P2 — Medium

**Definition:** A non-critical feature is impacted, or a recoverable issue is affecting a subset of users without blocking core workflows.

**Examples:**

- Review submission failing for < 5% of users
- Push notification delivery delay (> 5 minutes)
- Certain image uploads failing for specific file types
- Admin dashboard loading slowly (p95 > 3,000ms but < 5,000ms)
- Error rate between 0.5% and 2% sustained for > 15 minutes

**SLA:** Acknowledge within **4 hours**, resolve within **1 business day**.

---

### P3 — Low

**Definition:** Minor issues, degraded experiences, or early warnings that do not block users. Typically addressed in regular development cycles.

**Examples:**

- Console errors on specific pages not affecting functionality
- Slow API response times in non-critical paths (p95 > 1,000ms but < 2,000ms)
- Session replay capture failures (isolated, < 1% of sessions)
- New error type appearing for the first time (< 10 events/hour)
- Deprecation warnings in browser console

**SLA:** Acknowledge within **1 business day**, resolve within **1 week** or add to backlog.

---

## Service Level Indicators (SLIs) & Alert Thresholds

### Performance SLIs

| SLI Metric                  | P0 Threshold         | P1 Threshold         | P2 Threshold         | P3 Threshold          |
| --------------------------- | -------------------- | -------------------- | -------------------- | --------------------- |
| API p95 latency             | > 5,000ms            | > 2,000ms            | > 1,000ms            | > 500ms               |
| API p99 latency             | > 10,000ms           | > 5,000ms            | > 3,000ms            | > 2,000ms             |
| Page load time (LCP)        | > 5,000ms            | > 2,500ms            | > 1,500ms            | > 1,000ms             |
| Error rate (all errors)     | > 5%                 | > 2%                 | > 0.5%               | > 0.1%                |
| Availability (uptime check) | < 95%                | < 98%                | < 99%                | < 99.5%               |
| Successful job bookings     | < 80% success rate   | < 90% success rate   | < 95% success rate   | < 98% success rate    |

### Error Rate Thresholds

| Alert Type                  | Threshold             | Evaluation Window | Severity |
| --------------------------- | -------------------- | ----------------- | -------- |
| Global error spike          | > 50 errors/min       | 5 minutes         | P0       |
| Elevated error rate         | > 2% of all requests  | 5 minutes         | P1       |
| Moderate error rate         | > 0.5% of all requests| 15 minutes        | P2       |
| New error type              | > 10 events/hour      | 1 hour            | P3       |
| Payment error rate          | > 0.5% of payments    | 5 minutes         | P0       |
| Auth error rate             | > 5% of auth requests | 5 minutes         | P1       |
| Database query error        | > 1% of DB queries    | 5 minutes         | P1       |

### Health Check SLIs

| Endpoint                    | Expected Behavior                          | Alert On                          |
| --------------------------- | ------------------------------------------ | --------------------------------- |
| `GET /api/health`           | HTTP 200, < 100ms response                | HTTP != 200 or > 500ms            |
| `GET /api/health/ready`     | HTTP 200 when all dependencies ready       | Any non-200 status                |
| Supabase connectivity       | RLS policies enforced, < 50ms query time  | Query time > 500ms or connection error |

---

## Notification Channel Routing

### Routing Matrix

| Severity | Slack                          | Discord                            | Email                     | PagerDuty |
| -------- | ------------------------------ | ---------------------------------- | ------------------------- | --------- |
| P0       | `#alerts-sentry` (immediate)   | `#alerts-sentry` (urgent channel)  | All engineers + founders  | Yes       |
| P1       | `#alerts-sentry` (immediate)   | `#alerts-sentry` (urgent channel)  | On-call engineer          | Yes       |
| P2       | `#alerts-sentry` (daily digest)| N/A                                | On-call engineer          | No        |
| P3       | N/A                            | N/A                                | Weekly digest             | No        |

### Slack Configuration

> **TODO (TBD from stakeholders):** Replace placeholder channel IDs below with actual Slack channel IDs once the `#alerts-sentry` channel is created.
>
> - **Channel Name:** `#alerts-sentry`
> - **Channel ID (TBD):** `SLACK_CHANNEL_ID_PLACEHOLDER`
> - **Webhook URL (TBD):** `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX`

**Sentry Slack Integration Setup:**

1. Go to **Sentry > Settings > Integrations > Slack**
2. Connect your Slack workspace
3. Configure the following notification routing:
   - P0/P1: Post to `#alerts-sentry` with `@oncall` mention
   - P2: Post to `#alerts-sentry` without mention (digest)
   - P3: Disable Slack for P3 (email digest only)

**Slack Message Format:**

```
🚨 [P0/Critical] Service Outage Detected

Environment: production
Issue: Job booking API returning 500 for all requests
Events: 347 errors in last 5 minutes
Last seen: 2 minutes ago

→ View in Sentry: https://sentry.io/organizations/daily-worker-hub/issues/...
→ Runbook: https://docs.dailyworkerhub.com/runbooks/outage-response.md
```

### Discord Configuration

> **TODO (TBD from stakeholders):** Replace placeholder values below with actual Discord server and channel IDs once the alerting integration is configured.
>
> - **Discord Server ID (TBD):** `DISCORD_SERVER_ID_PLACEHOLDER`
> - **Channel Name:** `#alerts-sentry`
> - **Channel ID (TBD):** `DISCORD_CHANNEL_ID_PLACEHOLDER`
> - **Webhook URL (TBD):** `https://discord.com/api/webhooks/000000000000000000/XXXXXXXXXXXXXXXXXXXX`

**Sentry Discord Integration Setup:**

1. Go to **Sentry > Settings > Integrations > Discord**
2. Enter the Discord webhook URL
3. Map severity levels to Discord channel:
   - P0/P1: `#alerts-sentry` with `@here` ping
   - P2/P3: Post without ping

**Discord Message Format:**

```
@here 🚨 **P1 Alert — Elevated Error Rate**

**Environment:** production
**Issue:** Payment withdrawal API error rate > 2%
**Events:** 89 errors in last 5 minutes
**Impact:** ~45 workers unable to withdraw earnings

👉 [View in Sentry](https://sentry.io/organizations/daily-worker-hub/issues/...)
```

### Email Notifications

| Severity | Recipients                                          | Subject Prefix  |
| -------- | --------------------------------------------------- | --------------- |
| P0       | All engineers + founders                            | `[P0-CRITICAL]` |
| P1       | On-call engineer + engineering lead                 | `[P1-HIGH]`     |
| P2       | On-call engineer                                   | `[P2-MEDIUM]`   |
| P3       | Weekly digest → engineering team ( Wednesdays)      | `[P3-LOW]`      |

**On-Call Rotation:** See the on-call schedule in Notion. The on-call engineer is responsible for P0 and P1 acknowledgements outside business hours.

---

## Ownership Rules

Sentry ownership rules automatically assign the correct team/individual to an issue based on file paths or event tags. This ensures the right people are notified without manual assignment.

### Syntax Overview

Sentry supports two primary ownership syntaxes:

- **`path:<glob_pattern>`** — Assigns issues to the team owning the matching file path
- **`tag:<key>:<value>`** — Assigns issues to the team owning the matching tag value

Ownership rules are defined in `sentry.ini` (or `sentry.properties`) at the project root.

### Path-Based Ownership

Assigns ownership based on the file path in the stack trace.

```
# docs/.sentryclirc or sentry ownership section
# Syntax: pattern: owner

path:src/app/api/payments/*    -> payment-team
path:src/app/api/auth/*        -> auth-team
path:src/app/api/jobs/*        -> jobs-team
path:src/app/(dashboard)/business/* -> business-team
path:src/app/(dashboard)/worker/*   -> worker-team
path:src/components/*          -> frontend-team
path:supabase/functions/*      -> backend-team
path:lib/*                     -> infra-team
```

### Tag-Based Ownership

Assigns ownership based on event tags. This is useful for runtime-annotated errors.

```
# Tag-based rules
tag:component=payment    -> payment-team
tag:component=auth       -> auth-team
tag:component=api        -> jobs-team
tag:component=database    -> infra-team
tag:component=worker     -> worker-team
tag:component=business   -> business-team
tag:severity=fatal       -> oncall-engineer
tag:environment=production -> oncall-engineer
```

### Combined Ownership

You can combine both for maximum precision:

```
# Combined: requires both path AND tag to match
path:src/app/api/payments/* + tag:type=withdrawal -> payment-team
path:src/app/api/payments/* + tag:type=deposit    -> payment-team
path:src/app/api/payments/* + tag:type=refund    -> payment-team
```

### Setting Tags in Code

Apply ownership tags using the Sentry SDK helper functions defined in `lib/sentry.ts`:

```typescript
import { captureException } from "@/lib/sentry";

// Example: Report a payment error with ownership tags
captureException(error, {
  tags: {
    component: "payment",   // → routes to payment-team via tag rule
    type: "withdrawal",       // → routes to payment-team via combined rule
    severity: "high",
    environment: process.env.NODE_ENV,
  },
  extra: {
    amount: withdrawalAmount,
    workerId: workerId,
    walletId: walletId,
  },
});
```

### Team Assignment

| Team            | Scope                                  | Slack Channel   |
| --------------- | -------------------------------------- | --------------- |
| `oncall-engineer` | P0/P1 issues, any unassigned critical | `#oncall`      |
| `payment-team`    | All payment-related errors and alerts  | `#team-payment` |
| `auth-team`       | Authentication and authorization errors| `#team-auth`   |
| `jobs-team`       | Job posting, search, and booking APIs | `#team-jobs`   |
| `worker-team`     | Worker-facing features and flows       | `#team-worker` |
| `business-team`   | Business portal features and flows     | `#team-business` |
| `frontend-team`   | UI components, client-side errors       | `#team-frontend` |
| `infra-team`       | Database, caching, server config        | `#team-infra`   |

---

## SLA Mapping

### Response and Resolution SLAs

| Severity | Acknowledge Within | Resolve Within | Escalation After |
| -------- | ------------------ | -------------- | ---------------- |
| P0       | 15 minutes         | 2 hours        | 15 minutes (no ack) → All founders |
| P1       | 1 hour             | 4 hours        | 1 hour (no ack) → Engineering lead |
| P2       | 4 hours            | 1 business day | 4 hours (no ack) → Team lead |
| P3       | 1 business day     | 1 week         | None (backlog)   |

### Escalation Path

```
P0 Alert Triggered
  │
  ├─ Immediate: Slack #alerts-sentry + Discord ping + Email all engineers
  │
  ├─ 15 min no acknowledgement
  │    └─ Escalate: Notify all founders + engineering lead (SMS + call)
  │
  └─ 30 min not resolved
       └─ Escalate: Founders call, open incident bridge (Zoom/Google Meet)
```

```
P1 Alert Triggered
  │
  ├─ Immediate: Slack #alerts-sentry + Email on-call engineer
  │
  ├─ 1 hour no acknowledgement
  │    └─ Escalate: Engineering lead notified
  │
  └─ 2 hours not resolved
       └─ Escalate: All engineers + founders informed
```

```
P2 Alert Triggered
  │
  ├─ Immediate: Slack #alerts-sentry (digest, no ping)
  │
  └─ 4 hours no acknowledgement
       └─ Escalate: Team lead notified via Slack
```

```
P3 Alert Triggered
  │
  └─ Weekly digest (every Wednesday 09:00 WIT)
```

### On-Call Schedule

| Role              | Person       | Hours                      | Rotation |
| ----------------- | ------------ | -------------------------- | -------- |
| Primary On-Call   | (TBD by team)| Mon–Sun, 09:00–21:00 WIT   | Weekly   |
| Secondary On-Call | (TBD by team)| Mon–Sun, 21:00–09:00 WIT   | Weekly   |
| Engineering Lead  | David        | Always reachable (phone)   | Always   |

**On-Call Tool:** Configure PagerDuty integration for P0 and P1 alerts. See [OPERATIONS.md](./OPERATIONS.md) for team contacts.

---

## Creating Alert Rules in Sentry

### Step 1: Define Conditions

Go to **Sentry > Alerts > Create Alert Rule**.

#### P0 — Critical Error Spike

```
Name:        P0 — Critical Error Spike
Environment: production
Conditions:
  - The number of errors is more than 20 in 5 minutes
  - [AND] Event matches: tag:severity = fatal OR tag:level = fatal

Actions:
  - Send notification to Slack #alerts-sentry
  - Send notification to Discord #alerts-sentry
  - Send email to all engineers
  - Trigger PagerDuty (if > 50 errors)
```

#### P1 — Elevated Error Rate

```
Name:        P1 — Elevated API Error Rate
Environment: production
Conditions:
  - The percentage of sessions with errors is more than 2% in 5 minutes
  - [AND] Event matches: tag:component = api

Actions:
  - Send notification to Slack #alerts-sentry
  - Send email to on-call engineer
  - Trigger PagerDuty if > 5% error rate
```

#### P1 — High API Latency

```
Name:        P1 — High API Latency
Environment: production
Conditions:
  - The p95 response time is more than 2,000ms in 10 minutes
  - [AND] Transaction matches: name matches /api/*

Actions:
  - Send notification to Slack #alerts-sentry
  - Send email to on-call engineer
```

#### P2 — Moderate Performance Degradation

```
Name:        P2 — Moderate Performance Degradation
Environment: production
Conditions:
  - The p95 response time is more than 1,000ms in 15 minutes
  - [AND] Transaction matches: name matches /api/*

Actions:
  - Send notification to Slack #alerts-sentry (digest, no mention)
```

#### P3 — New Error Type

```
Name:        P3 — New Error Type Detected
Environment: production
Conditions:
  - An issue is first seen
  - [AND] Event matches: tag:environment = production

Actions:
  - Add to weekly digest (no immediate notification)
```

### Step 2: Configure Notification Routing

1. In the alert rule editor, under **"Set alert as..."** select the appropriate alert name prefix (`[P0-CRITICAL]`, `[P1-HIGH]`, etc.)
2. Under **"Notify"**, select:
   - **Slack** → `#alerts-sentry`
   - **Discord** → `#alerts-sentry` (P0/P1 only)
   - **Email** → appropriate distribution list per severity
   - **PagerDuty** → P0 and P1 only
3. Enable **"Include tags"** with `component`, `environment`, `version` for context

### Step 3: Add to Alert Dashboard

Add all alert rules to the **Alerting Dashboard** in Sentry for a unified overview:

1. **Active Alerts** — Current P0 and P1 alerts
2. **Alert History** — Resolved alerts with time-to-resolve metrics
3. **MTTD (Mean Time To Detect)** — Average detection time per severity
4. **MTTR (Mean Time To Resolve)** — Average resolution time per severity

---

## Runbooks

Quick reference runbooks for common P0/P1 scenarios:

| Scenario                         | Runbook Link                                             |
| -------------------------------- | ------------------------------------------------------- |
| Complete API outage              | `docs/runbooks/outage-response.md` (TBD)               |
| Payment processing failures       | `docs/runbooks/payment-incident-response.md` (TBD)     |
| Database connection exhaustion   | `docs/runbooks/database-incident.md` (TBD)             |
| Authentication bypass detected    | `docs/runbooks/auth-security-incident.md` (TBD)        |
| High error rate — unknown cause  | `docs/runbooks/error-rate-investigation.md` (TBD)       |
| High latency — API degradation   | `docs/runbooks/performance-degradation.md` (TBD)      |

> **TODO:** Create runbook files. Until then, follow the incident response SOP in [OPERATIONS.md](./OPERATIONS.md#incident-response).

---

## Review & Tuning

- **Weekly:** Review all P3 alerts; archive false positives, escalate recurring P3s to P2
- **Monthly:** Review alert volumes, adjust thresholds based on traffic growth
- **Quarterly:** Full review of ownership rules, notification routing, and SLA compliance

---

**Document Owner:** Sasha (AI Co-founder)
**Last Review:** March 31, 2026
**Next Review:** Monthly
