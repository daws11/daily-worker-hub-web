# Incident Response Runbook

> **How to Use This Runbook**
> - Every action item is a checklist or numbered step (≤2 lines each).
> - Severity badges: 🔴 L1 = Critical, 🟡 L2 = High, 🟢 L3 = Low.
> - Use `Ctrl+F` / `Cmd+F` to jump to a scenario in < 5 seconds.
> - Follow the **Severity Levels → Escalation Path → Scenario** order.
> - Fill in all `[placeholders]` before sending any communication.
> - Do not skip steps under pressure — checklists exist for a reason.

---

## 1. Severity Levels

| Badge | Level | Definition | Response Time | Examples |
|-------|-------|------------|---------------|----------|
| 🔴 L1 | Critical | Full service outage; data breach in progress; payment processing down | Immediate (< 15 min) | API returning 5xx for all requests; user data leaked; payments cannot be processed |
| 🟡 L2 | High | Major feature degraded; >25% of users affected; partial data exposure risk | < 30 minutes | Login failures; job search broken; notifications delayed >5 min |
| 🟢 L3 | Low | Minor issue; isolated impact; workaround available | < 4 hours | Single user reports issue; cosmetic bug; non-critical job posting fails |

**Severity Classification Rules:**
- If the impact scope is unknown → default to the higher severity.
- If a breach is *suspected* but not confirmed → treat as L1 until cleared.
- If multiple severity indicators apply → use the highest.

---

## 2. Escalation Paths

### Primary Chain of Command

```
On-call Engineer → Engineering Lead → CTO → CEO
         ↓                ↓              ↓       ↓
    PagerDuty alert   Slack #incident  Phone   External PR
```

### Who to Notify by Severity

| Severity | Immediate | +15 min | +30 min | +1 hour |
|----------|-----------|---------|---------|---------|
| 🔴 L1 | On-call engineer, Engineering Lead | CTO | CEO, Legal | External counsel, PR |
| 🟡 L2 | On-call engineer | Engineering Lead | CTO | — |
| 🟢 L3 | On-call engineer | — | Engineering Lead | — |

### Contact Details

| Role | Primary Contact | Backup Contact |
|------|-----------------|----------------|
| On-call Engineer | PagerDuty rotation | N/A |
| Engineering Lead | `[eng_lead_email]` | `[eng_lead_backup_email]` |
| CTO | `[cto_email]` | `[cto_phone]` |
| CEO | `[ceo_email]` | `[ceo_phone]` |
| Legal / Compliance | `[legal_email]` | `[legal_phone]` |
| PR / Communications | `[pr_email]` | `[pr_phone]` |

### Escalation Triggers
- L1 → automatically escalates to CTO within 15 min if not resolved.
- L2 → escalates to CTO if no progress in 30 min.
- Any confirmed breach → immediately escalate to Legal + CEO.

---

## 3. Incident Scenarios

---

### 3A. Service Downtime

**Detection Triggers:**
- [ ] API health endpoint returns non-200 for > 2 min.
- [ ] PagerDuty alert fires for `/health` or uptime monitor.
- [ ] >10% of user-facing requests returning 5xx.
- [ ] Sentry alert for critical API errors spiking.
- [ ] User reports in #support channel: "can't load the app."

#### Immediate Response Checklist

1. [ ] Acknowledge PagerDuty alert within 2 min.
2. [ ] Check Vercel/Supabase status pages for known outages.
3. [ ] Verify Supabase project is running (check dashboard).
4. [ ] Check Supabase logs for database connection errors.
5. [ ] Check Vercel function logs for runtime errors.
6. [ ] Run `ping` or `curl` against the production API endpoint manually.
7. [ ] If database is the issue → restart Supabase instance or scale up.
8. [ ] If Vercel → check for deployed changes, roll back if needed.
9. [ ] Post `[time_detected]` in `#incident` Slack channel: "Investigating service downtime."
10. [ ] If unresolved in 10 min → escalate to Engineering Lead.

#### Escalation Path

```
On-call Engineer
  → (no progress in 10 min) → Engineering Lead
  → (no progress in 15 min) → CTO
  → (L1 confirmed, 30 min) → CEO + Legal
```

#### Communication Templates

**Internal (Slack #incident):**
```
🔴 INCIDENT [incident_id] — Service Downtime
Detected: [time_detected]
Impact: [impact_scope] (e.g. all users cannot access job search)
Status: Investigating
Next update: [time]
Contact: [team_contact]
```

**External (Status Page / Users):**
```
We are currently experiencing an outage affecting [affected_service].
Our team is actively investigating. We will provide an update by [eta].
Apologies for the inconvenience.
— [team_contact]
```

#### Resolution Checklist

1. [ ] Confirm all critical API endpoints returning 200.
2. [ ] Confirm user-facing pages loading correctly.
3. [ ] Verify Supabase database is responsive and queries succeed.
4. [ ] Clear any error alerts in Sentry / PagerDuty.
5. [ ] Post resolution update in `#incident` Slack.
6. [ ] Update status page to "All systems operational."
7. [ ] Notify Engineering Lead of resolution.
8. [ ] Schedule post-mortem within 48 hours.

---

### 3B. Data Breach

**Detection Triggers:**
- [ ] Unauthorized access alert from Supabase Auth logs.
- [ ] Unexpected rows in `profiles` or `users` table (unusual IP, volume).
- [ ] User reports unauthorized account activity.
- [ ] Security scan or vulnerability report indicating exposure.
- [ ] AWS/S3 bucket access anomaly detected.
- [ ] GDPR / compliance flag triggered.

#### Immediate Response Checklist

1. [ ] Assume breach is real until proven otherwise.
2. [ ] Isolate the affected system — revoke API keys, rotate secrets.
3. [ ] Identify scope: what data was accessed, how many users affected.
4. [ ] Take timestamp: `[time_detected]`.
4. [ ] Immediately escalate to Engineering Lead + CTO.
5. [ ] Do NOT attempt to "fix" logs or hide the breach.
6. [ ] Preserve evidence: export Supabase Auth logs, API logs.
7. [ ] If PII is exposed → document exactly what fields were exposed.
8. [ ] Engage Legal counsel within 30 min.
9. [ ] Notify CEO within 30 min.
10. [ ] Post in `#incident` Slack: "Confirmed data breach, [impact_scope]."

#### Escalation Path

```
On-call Engineer
  → (immediately) → Engineering Lead + CTO
  → (immediately) → Legal + CEO
  → (if user data confirmed) → External counsel + Data Protection Authority
```

#### Communication Templates

**Internal (Slack #incident + PagerDuty):**
```
🔴 INCIDENT [incident_id] — DATA BREACH CONFIRMED
Detected: [time_detected]
Impact: [impact_scope] (e.g. 142 user profiles accessed without authorization)
Data exposed: [list fields — e.g. name, email, phone]
Action taken: [what was isolated/revoked]
Legal notified: [yes/no — time]
Next update: [time]
Contact: [team_contact]
```

**External (Affected Users — Email):**
```
Subject: Important Security Notice — Action Required

Dear [user_name],

We are contacting you because we discovered unauthorized access to your account
on [date_detected]. The following information may have been accessed:
[data_fields_exposed].

What we have done: [actions_taken].

What you should do: [list action items — e.g. change password, monitor accounts].

We are investigating and have notified [data_protection_authority].

If you have questions, contact [support_email].

— The [company_name] Security Team
```

**Regulatory Notice (if applicable under GDPR/PDPA):**
```
We are reporting a personal data breach to [Data Protection Authority].
Incident ID: [incident_id]
Date detected: [time_detected]
Description: [impact_scope]
Data affected: [data_categories]
Approximate number of data subjects: [number]
```

#### Resolution Checklist

1. [ ] Confirm breach vector is closed (no active unauthorized access).
2. [ ] Rotate all potentially compromised credentials and API keys.
3. [ ] Restore affected accounts/data from known-good backup if possible.
4. [ ] Notify all affected users within 72 hours (GDPR requirement).
5. [ ] File regulatory notice within required timeframe.
6. [ ] Conduct security audit before re-enabling affected systems.
7. [ ] Document root cause and timeline in post-mortem.
8. [ ] Implement compensating controls to prevent recurrence.
9. [ ] Report resolution to CTO + Legal.

---

### 3C. Payment Failures

**Detection Triggers:**
- [ ] Stripe dashboard shows spike in failed payment intents (>20% failure rate).
- [ ] User reports in #support: "can't pay for subscription / job posting."
- [ ] Webhook delivery failures in Stripe (payment_intent.succeeded missing).
- [ ] Revenue dashboard shows $0 incoming when expected > $X.
- [ ] Supabase `payments` table shows rows stuck in `pending` for > 30 min.
- [ ] Alert from Stripe anomaly detection.

#### Immediate Response Checklist

1. [ ] Check Stripe status page (status.stripe.com).
2. [ ] Verify Stripe API keys are active in Supabase Edge Functions.
3. [ ] Check Supabase Edge Function logs for payment_intent errors.
4. [ ] Confirm webhook endpoint is reachable (`/api/webhooks/stripe`).
5. [ ] If Stripe is down → monitor; no action needed until they recover.
6. [ ] If keys are invalid → rotate to backup Stripe key.
7. [ ] Check if `STRIPE_SECRET_KEY` or `STRIPE_WEBHOOK_SECRET` was revoked.
8. [ ] Verify test/live mode toggle is correct for the environment.
9. [ ] Post in `#incident` Slack: "Investigating payment failures, [impact_scope]."
10. [ ] If > $500/hr revenue loss → escalate to Engineering Lead + CTO.

#### Escalation Path

```
On-call Engineer
  → (revenue loss > $500/hr or > 30 min unresolved) → Engineering Lead
  → (no progress in 30 min) → CTO
  → (data integrity concern — double charges / lost payments) → CEO + Legal
```

#### Communication Templates

**Internal (Slack #incident):**
```
🟡 INCIDENT [incident_id] — Payment Failures
Detected: [time_detected]
Impact: [impact_scope] (e.g. ~23 users failed to purchase job postings in the last hour)
Payment provider status: [Stripe status — operational/degraded/down]
Error codes observed: [e.g. card_declined, insufficient_funds]
Action: [investigating / rolling back keys / waiting on Stripe]
Next update: [time]
Contact: [team_contact]
```

**External (Affected Users):**
```
Subject: Payment Issue — [company_name]

Hi [user_name],

We experienced a temporary issue processing payments today between [time_range].
Your payment was NOT charged. Please retry at [retry_url].

If you were charged but did not receive your purchase, contact [support_email]
with your reference: [payment_intent_id].

We apologize for the inconvenience.

— The [company_name] Team
```

#### Resolution Checklist

1. [ ] Confirm Stripe API is operational and test payment succeeds.
2. [ ] Verify all failed payments are reflected correctly in Stripe dashboard.
3. [ ] Process any failed webhook deliveries manually or via retry.
4. [ ] Confirm no duplicate charges were made.
5. [ ] Send retry instructions to affected users.
6. [ ] Post resolution update in `#incident` Slack.
7. [ ] If revenue was lost > $X → notify Finance + CTO.
8. [ ] Schedule post-mortem if outage > 1 hour or > 10 users affected.
9. [ ] Add monitoring alert for payment failure rate > 10%.

---

### 3D. Performance Degradation

**Detection Triggers:**
- [ ] P95 response time > 3s on Vercel function metrics.
- [ ] Database query latency > 1s in Supabase dashboard.
- [ ] Sentry alert for slow API responses or timeouts.
- [ ] User reports in #support: "app is loading very slowly."
- [ ] Supabase connection pool exhausted (error: "too many connections").
- [ ] Memory / CPU spike on Supabase project (dashboard).
- [ ] CDN cache miss rate > 80% causing origin overload.

#### Immediate Response Checklist

1. [ ] Check Vercel function invocation duration in Vercel dashboard.
2. [ ] Check Supabase dashboard → Performance tab for slow queries.
3. [ ] Identify top slow queries (usually missing indexes or N+1 patterns).
4. [ ] If connection pool exhausted → scale Supabase or restart pool.
5. [ ] If cache miss rate high → purge CDN cache; investigate cache keys.
6. [ ] Check for deployed changes in the last 2 hours that could cause slowdown.
7. [ ] Roll back last deployment if performance correlates with it.
8. [ ] If database → identify and kill long-running queries.
9. [ ] If slow query is in code → add index or optimize query (requires hotfix).
10. [ ] Post in `#incident` Slack: "Performance degraded, [impact_scope]."
11. [ ] If P95 > 10s → escalate to Engineering Lead.

#### Escalation Path

```
On-call Engineer
  → (P95 > 10s for 15 min, or source of degradation unknown) → Engineering Lead
  → (no progress in 30 min) → CTO
  → (full degradation approaching outage threshold) → CEO
```

#### Communication Templates

**Internal (Slack #incident):**
```
🟡 INCIDENT [incident_id] — Performance Degradation
Detected: [time_detected]
Impact: [impact_scope] (e.g. job search taking 8–12s to load; ~40% of users affected)
Current P95 latency: [value]ms (target: <1000ms)
Likely cause: [hypothesis — e.g. slow query on jobs table, CDN cache miss]
Action: [steps being taken]
Next update: [time]
Contact: [team_contact]
```

**External (Status Page / Users):**
```
We are experiencing slowness with [affected_service] as of [time_detected].
Our team is actively working to resolve this. Expected resolution: [eta].
We apologize for the inconvenience.
— [team_contact]
```

#### Resolution Checklist

1. [ ] Confirm P95 latency is back below 1,000ms.
2. [ ] Verify all critical user flows (login, job search, payment) are performing normally.
3. [ ] Confirm Supabase connection pool usage is below 80%.
4. [ ] Ensure all slow query alerts in Sentry are resolved.
5. [ ] If a hotfix was deployed → verify it did not introduce regressions.
6. [ ] Update status page to "All systems operational."
7. [ ] Post resolution update in `#incident` Slack.
8. [ ] Document root cause (slow query / cache issue / deployment).
9. [ ] Schedule post-mortem if degradation lasted > 30 min.

---

## 4. Post-Mortem Template

> Fill this out within 48 hours of any L1 or L2 incident, and any L3 lasting > 1 hour.

### Post-Mortem: [Incident Title]

| Field | Details |
|-------|---------|
| **Incident ID** | `[incident_id]` |
| **Date & Time Detected** | `[time_detected]` |
| **Date & Time Resolved** | `[time_resolved]` |
| **Duration** | `[duration_minutes] minutes` |
| **Severity** | `🔴 L1 / 🟡 L2 / 🟢 L3` |
| **Affected Service(s)** | `[affected_service]` |
| **Impact Scope** | `[impact_scope]` |
| **PrimaryResponder(s)** | `[team_contact]` |

#### Timeline

| Time | Event |
|------|-------|
| `[HH:MM]` | Alert received / issue detected |
| `[HH:MM]` | First responder acknowledged |
| `[HH:MM]` | Root cause identified |
| `[HH:MM]` | Fix deployed / mitigations applied |
| `[HH:MM]` | Confirmed resolved |
| `[HH:MM]` | Post-mortem scheduled |

#### Root Cause
> Describe what caused the incident in 1–3 sentences. Be specific.

`[root_cause_description]`

#### Contributing Factors
> What conditions made this worse or harder to detect?

- `[factor_1]`
- `[factor_2]`
- `[factor_3]`

#### Impact
> Quantify the impact. Be honest.

- Users affected: `[number]`
- Revenue impact: `$[amount]` or `N/A`
- SLA breach: `[yes/no — if applicable]`
- Data integrity impact: `[yes/no]`

#### What Went Well
- `[positive_1]`
- `[positive_2]`

#### What Went Poorly
- `[negative_1]`
- `[negative_2]`

#### Action Items

| Action | Owner | Due Date | Priority |
|--------|-------|----------|----------|
| `[action_1]` | `[owner]` | `[date]` | 🔴 High |
| `[action_2]` | `[owner]` | `[date]` | 🟡 Medium |
| `[action_3]` | `[owner]` | `[date]` | 🟢 Low |

#### Detection Improvement
> How could we have detected this faster?

`[improvement_description]`

#### Prevention Improvement
> How do we prevent this from happening again?

`[prevention_description]`

---

## 5. Consolidated Communication Templates

### Status Page Announcement Template
```
Title: [Brief Title — e.g. Service Outage Resolved]
Status: [Investigating / Identified / Monitoring / Resolved]
Body:
[1-2 sentences describing current state. No jargon.]

Next update: [time]
```

### Stakeholder Update (for ongoing L1 incidents, every 30 min)
```
🔴 STATUS UPDATE — [incident_id]
Time: [HH:MM]
Status: [Investigating / Identified / Resolving / Monitoring]
What we know: [impact_scope]
What we are doing: [current_action]
What we don't know yet: [open_questions]
Next update: [HH:MM]
Contact: [team_contact]
```

### All-Clear Message
```
✅ [incident_id] — RESOLVED
Resolved at: [time_resolved]
Duration: [duration_minutes]
Impact: [impact_scope]
Root cause: [brief_one_liner]
Post-mortem: [scheduled link / date]
```

### Customer-Facing Email (Generic)
```
Subject: [Brief description of issue or resolution]

Dear [user_name],

[2–3 sentences. State what happened, what was done, and next steps.
Do not blame the user. Do not promise features.]

If you have questions: [support_email]
System status: [status_page_url]

— The [company_name] Team
[Date]
```

### Regulatory Breach Notification Template
```
To: [Data Protection Authority / relevant regulator]
From: [company_name] <[contact_email]>
Date: [date]
Subject: Personal Data Breach Notification — [incident_id]

1. Nature of breach: [description]
2. Data categories affected: [categories]
3. Approximate number of data subjects: [number]
4. Likely consequences: [description]
5. Measures taken: [actions_taken]
6. Contact point for further information: [contact_email]
```

---

## Appendix: Quick Reference Card

Print or bookmark this section for the fastest reference during an incident.

```
╔══════════════════════════════════════════════════════════╗
║           INCIDENT QUICK REFERENCE                       ║
╠══════════════════════════════════════════════════════════╣
║ 🔴 L1 = Full outage / breach / payments down            ║
║ 🟡 L2 = Major degraded / >25% users / partial breach   ║
║ 🟢 L3 = Minor / isolated / workaround exists            ║
╠══════════════════════════════════════════════════════════╣
║ INCIDENT CHANNEL: #incident                             ║
║ STATUS PAGE: [status_page_url]                           ║
║ PAGERDUTY: [pagerduty_url]                               ║
╠══════════════════════════════════════════════════════════╣
║ SCENARIO → GO TO SECTION:                               ║
║ Service Downtime     → §3A                               ║
║ Data Breach          → §3B                               ║
║ Payment Failures     → §3C                               ║
║ Performance Degraded → §3D                               ║
║ Post-mortem          → §4                                ║
║ Templates            → §5                                ║
╚══════════════════════════════════════════════════════════╝
```

---

*Last reviewed: [date] | Next review: [date + 3 months] | Owner: Engineering Team*
