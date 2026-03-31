# Sentry Dashboard Templates

> **Related:** See [sentry-setup.md](./sentry-setup.md) for SDK configuration. See [sentry-alerting.md](./sentry-alerting.md) for severity tiers, alert rules, and ownership rules.

This document provides widget specifications for three Sentry dashboard templates, one per persona. Actual Sentry UI creation requires manual action at [sentry.io](https://sentry.io/organizations/{org}/dashboards/).

---

## Overview

Each dashboard is scoped to a specific persona. Dashboards are created in **Sentry > Dashboards > Create Dashboard** and populated with the widgets described below.

**Sentry Dashboard Widget Types Available:**

| Widget Type | Use Case |
| ----------- | -------- |
| `area`      | Cumulative values over time (error counts, user impact) |
| `line`      | Trends over time with multiple series |
| `bar`       | Discrete comparisons (by release, environment, team) |
| `pie`       | Distribution breakdowns (error types, issue assignees) |
| `table`     | Issue lists with sortable columns |
| `big_number`| Single KPI values (total counts, percentages) |
| `svg` / `control` | Filters and inputs (environment, date range) |

**Refresh Rates:**

| Environment | Recommended Refresh |
| ----------- | ------------------- |
| Production  | 5 minutes (active monitoring) |
| Staging     | 15 minutes |
| Development | Manual only |

---

## Dashboard 1 — Engineering Lead

**Audience:** Engineering Lead, CTO, VP of Engineering
**Purpose:** Overall platform health, long-term error trends, and team performance visibility.
**Suggested Refresh:** Every **5 minutes** (production), or 1 hour for staging.

### Widget Specifications

#### 1.1 — Total Error Count (7d)

| Property | Value |
| -------- | ----- |
| **Chart Type** | `big_number` |
| **Query** | `timeseries: count()` |
| **Filter** | `environment:[production, staging]` |
| **Time Range** | Last 7 days |
| **Formula** | Raw count of all events |
| **Placement** | Top-left of dashboard grid |

**Sentry UI Steps:**
1. Click **"Add Widget"**
2. Select **"Big Number"**
3. Enter query: `count()`
4. Set environment filter to `[production, staging]`
5. Set time range: **Last 7 days**
6. Title: `Total Errors — 7d`

---

#### 1.2 — Error Frequency Over Time

| Property | Value |
| -------- | ----- |
| **Chart Type** | `line` |
| **Query** | `timeseries: count()` grouped by `issue` |
| **Filter** | `environment:production` |
| **Time Range** | Last 30 days |
| **Interval** | 1 day |
| **Formula** | `count() / 86400` (errors per day) |
| **Placement** | Full-width below widget 1.1 |

**Sentry UI Steps:**
1. Add Widget > **Line Chart**
2. Query: `count()`
3. Group by: `issue` (optional — toggle "Group by" to see top issues separately)
4. Filter: `environment:production`
5. Time range: **Last 30 days**
6. Resolution: **1d**
7. Title: `Error Frequency — 30d (Daily)`

---

#### 1.3 — Error Count by Environment

| Property | Value |
| -------- | ----- |
| **Chart Type** | `bar` |
| **Query** | `timeseries: count()` grouped by `environment` |
| **Filter** | `environment:[production, staging]` |
| **Time Range** | Last 7 days |
| **Interval** | 1 day |
| **Formula** | Per-environment bar |
| **Placement** | Left column |

**Sentry UI Steps:**
1. Add Widget > **Bar Chart**
2. Query: `count()`
3. Group by: `environment`
4. Filter: `environment:[production, staging]`
5. Time range: **Last 7 days**
6. Title: `Errors by Environment — 7d`

---

#### 1.4 — Error Count by Team / Component

| Property | Value |
| -------- | ----- |
| **Chart Type** | `pie` |
| **Query** | `count()` grouped by `tags[component]` |
| **Filter** | `environment:production` |
| **Time Range** | Last 14 days |
| **Formula** | Percentage distribution |
| **Placement** | Right column |

**Sentry UI Steps:**
1. Add Widget > **Pie Chart**
2. Query: `count()`
3. Group by: `tags[component]`
4. Filter: `environment:production`
5. Time range: **Last 14 days**
6. Title: `Errors by Team/Component — 14d`

> **Note:** This widget requires `component` tags to be set in code via `captureError()` or `captureException()`. See `lib/sentry.ts` and `lib/sentry/client.ts` for the `component` tag usage pattern.

---

#### 1.5 — Mean Time to Detect (MTTD)

| Property | Value |
| -------- | ----- |
| **Chart Type** | `big_number` |
| **Query** | `stats(): MTTD` (Sentry内置统计) |
| **Filter** | `environment:production` |
| **Time Range** | Last 7 days |
| **Formula** | Average time from first event to first seen |
| **Placement** | Below environment chart |

**Sentry UI Steps:**
1. Add Widget > **Big Number**
2. In **Stats** section, select **Mean Time to Detect**
3. Filter: `environment:production`
4. Time range: **Last 7 days**
5. Title: `MTTD — 7d`

---

#### 1.6 — Mean Time to Resolve (MTTR)

| Property | Value |
| -------- | ----- |
| **Chart Type** | `big_number` |
| **Query** | `stats(): MTTR` (Sentry内置统计) |
| **Filter** | `environment:production` |
| **Time Range** | Last 7 days |
| **Formula** | Average time from first seen to resolved |
| **Placement** | Below MTTD |

**Sentry UI Steps:**
1. Add Widget > **Big Number**
2. In **Stats** section, select **Mean Time to Resolve**
3. Filter: `environment:production`
4. Time range: **Last 7 days**
5. Title: `MTTR — 7d`

---

#### 1.7 — Top 10 Unresolved Issues

| Property | Value |
| -------- | ----- |
| **Chart Type** | `table` |
| **Query** | `count()` grouped by `issue` |
| **Filter** | `is:unresolved environment:production` |
| **Time Range** | Last 14 days |
| **Sort By** | `count()` descending |
| **Columns** | Issue title, Count, Assignee, Suspect |
| **Placement** | Below pie chart |

**Sentry UI Steps:**
1. Add Widget > **Table**
2. Query: `count()`
3. Group by: `issue`
4. Filter: `is:unresolved environment:production`
5. Sort by: `count()` (descending)
6. Columns: Title, Count, User, Assignee
7. Limit: **10**
8. Title: `Top 10 Unresolved Issues — 14d`

---

#### 1.8 — User Impact (Affected Users)

| Property | Value |
| -------- | ----- |
| **Chart Type** | `line` |
| **Query** | `timeseries: count_unique(user.id)` |
| **Filter** | `environment:production` |
| **Time Range** | Last 30 days |
| **Interval** | 1 day |
| **Formula** | Unique users affected per day |
| **Placement** | Below error frequency chart |

**Sentry UI Steps:**
1. Add Widget > **Line Chart**
2. Query: `count_unique(user.id)`
3. Filter: `environment:production`
4. Time range: **Last 30 days**
5. Resolution: **1d**
6. Title: `Affected Users — 30d`

---

#### Dashboard 1 Layout Summary

```
┌─────────────────────┬─────────────────────────────┐
│ Total Errors — 7d   │                             │
│ (big_number)        │  Top 10 Unresolved Issues   │
├─────────────────────┤  (table)                   │
│ MTTD — 7d           │                             │
│ (big_number)        ├─────────────────────────────┤
├─────────────────────┤  Errors by Component       │
│ MTTR — 7d           │  (pie)                      │
│ (big_number)        │                             │
├─────────────────────┴─────────────────────────────┤
│  Error Frequency — 30d (Daily)                    │
│  (line, full-width)                                │
├────────────────────────────────────────────────────┤
│  Affected Users — 30d                              │
│  (line, full-width)                                │
└────────────────────────────────────────────────────┘
```

---

## Dashboard 2 — On-Call

**Audience:** Primary On-Call Engineer, Secondary On-Call, Engineering Lead
**Purpose:** Surface active critical/high-severity issues, P0/P1 alerts, and correlate errors with deployments.
**Suggested Refresh:** Every **5 minutes** (production).

### Widget Specifications

#### 2.1 — Active P0 / P1 Issues

| Property | Value |
| -------- | ----- |
| **Chart Type** | `table` |
| **Query** | `count()` grouped by `issue` |
| **Filter** | `is:unresolved tag:severity:[fatal, high]` OR `tag:level:[fatal,error]` AND `timeseries:>10 in 5m` |
| **Time Range** | Last 24 hours |
| **Sort By** | `lastSeen` descending |
| **Columns** | Issue title, Count (1h), Level, Assignee, Link |
| **Placement** | Top of dashboard (full-width) |

> **Note:** Sentry alerting rules in `sentry-alerting.md` define P0 as `tag:severity=fatal` or >20 errors/5m, and P1 as `tag:severity=high` or error rate >2%/5m. Use those same tag conditions here.

**Sentry UI Steps:**
1. Add Widget > **Table**
2. Query: `count()`
3. Group by: `issue`
4. Filter: `is:unresolved tag:severity IN [fatal, high]`
5. Sort by: `lastSeen` (descending)
6. Limit: **20**
7. Title: `Active P0/P1 Issues`

---

#### 2.2 — Error Rate Spike Detector

| Property | Value |
| -------- | ----- |
| **Chart Type** | `big_number` |
| **Query** | `percentage(count()` / `count()) * 100` |
| **Filter** | `environment:production` |
| **Time Range** | Last 5 minutes |
| **Formula** | `(error_count / total_transaction_count) * 100` |
| **Placement** | Right of P0/P1 table |

**Sentry UI Steps:**
1. Add Widget > **Big Number**
2. In the query editor, use: `count()` with filter `environment:production`
3. This shows raw event count; for rate %, use the **Stats** tab and select Error Rate
4. Title: `Error Rate — 5m`

---

#### 2.3 — Error Rate Over Time (5m Intervals)

| Property | Value |
| -------- | ----- |
| **Chart Type** | `line` |
| **Query** | `timeseries: count()` |
| **Filter** | `environment:production` |
| **Time Range** | Last 1 hour |
| **Interval** | 5 minutes |
| **Formula** | Count per interval |
| **Placement** | Below P0/P1 table |

**Sentry UI Steps:**
1. Add Widget > **Line Chart**
2. Query: `count()`
3. Filter: `environment:production`
4. Time range: **Last 1 hour**
5. Resolution: **5m**
6. Title: `Error Count — 1h (5m intervals)`

---

#### 2.4 — Errors by Release (Deployment Correlation)

| Property | Value |
| -------- | ----- |
| **Chart Type** | `bar` |
| **Query** | `timeseries: count()` grouped by `release` |
| **Filter** | `environment:production` |
| **Time Range** | Last 7 days |
| **Interval** | 1 day |
| **Formula** | Stacked bars per release |
| **Placement** | Left column |

**Sentry UI Steps:**
1. Add Widget > **Bar Chart**
2. Query: `count()`
3. Group by: `release`
4. Filter: `environment:production`
5. Time range: **Last 7 days**
6. Title: `Errors by Release — 7d`

> **Use Case:** When a new release shows an error spike, it may indicate a deployment-related regression. Correlate with deployment timestamps in the **Releases** tab of Sentry.

---

#### 2.5 — Errors Before / After Latest Release

| Property | Value |
| -------- | ----- |
| **Chart Type** | `bar` (2 series) |
| **Query** | `timeseries: count()` grouped by `release` |
| **Filter** | `environment:production release:latest` vs `release:latest - 1` |
| **Time Range** | Last 3 days |
| **Interval** | 6 hours |
| **Formula** | Compare error rate before and after deploy |
| **Placement** | Right column |

**Sentry UI Steps:**
1. Add Widget > **Bar Chart**
2. Series A: `count()` filter `release:latest`
3. Series B: `count()` filter `release:latest - 1`
4. Time range: **Last 3 days**
5. Resolution: **6h**
6. Title: `Pre vs Post Deploy Error Rate`

---

#### 2.6 — Active Alert Instances

| Property | Value |
| -------- | ----- |
| **Chart Type** | `big_number` |
| **Query** | Sentry Alert stats (not a widget query) |
| **Data Source** | **Alert Insights** tab in Sentry sidebar |
| **Time Range** | Current |
| **Formula** | Count of unresolved alert incidents |
| **Placement** | Below Error Rate widget |

> **Note:** Alert instance counts are available in the **Alerts** section of Sentry, not as a standard widget query. Add this as a pinned "Alert Summary" widget if available in your Sentry plan, or reference the Alerts page directly.

**Alternative (if Alert widget unavailable):**
Use a table querying for high-frequency issues:
1. Add Widget > **Table**
2. Query: `count(): >10 in 5m`
3. Filter: `is:unresolved environment:production`
4. Title: `High-Frequency Issues (potential alerts)`

---

#### 2.7 — On-Call Quick Links

| Property | Value |
| -------- | ----- |
| **Chart Type** | `big_number` / markdown |
| **Content** | Sentry links for one-click navigation |
| **Links** | Alert rules, Issue stream, Releases, Discover |
| **Placement** | Sidebar or top of dashboard |

**Sentry UI Steps:**
1. Add Widget > **Big Number** (or Description/Text widget if available)
2. Add descriptive links:

```
On-Call Quick Links:
- Active Alerts: https://sentry.io/organizations/{org}/alerts/rules/
- Issue Stream:  https://sentry.io/organizations/{org}/issues/
- Releases:      https://sentry.io/organizations/{org}/releases/
- Discover:      https://sentry.io/organizations/{org}/discover/queries/
```

---

#### Dashboard 2 Layout Summary

```
┌─────────────────────────────────────────────────────┐
│  Active P0/P1 Issues (table, full-width)            │
├──────────────────────────┬──────────────────────────┤
│  Error Rate — 5m         │  Pre vs Post Deploy      │
│  (big_number)            │  (bar)                   │
├──────────────────────────┴──────────────────────────┤
│  Error Count — 1h (5m intervals)                    │
│  (line, full-width)                                │
├──────────────────────────┬──────────────────────────┤
│  Errors by Release — 7d │  High-Frequency Issues    │
│  (bar)                  │  (table)                 │
└──────────────────────────┴──────────────────────────┘
```

---

## Dashboard 3 — Developer

**Audience:** Individual contributors, engineers on specific teams
**Purpose:** Personal issue visibility, assigned items, and development velocity tracking.
**Suggested Refresh:** Every **15 minutes** (or manual).

### Widget Specifications

#### 3.1 — My Assigned Issues

| Property | Value |
| -------- | ----- |
| **Chart Type** | `table` |
| **Query** | `count()` grouped by `issue` |
| **Filter** | `is:unresolved assigned:[me]` |
| **Time Range** | Last 30 days |
| **Sort By** | `lastSeen` descending |
| **Columns** | Issue title, Count, Level, Age, Assignee |
| **Placement** | Top-left of dashboard |

**Sentry UI Steps:**
1. Add Widget > **Table**
2. Query: `count()`
3. Group by: `issue`
4. Filter: `is:unresolved assigned:[me]`
5. Sort by: `lastSeen` (descending)
6. Title: `My Assigned Issues`

---

#### 3.2 — My Issues Created Today

| Property | Value |
| -------- | ----- |
| **Chart Type** | `big_number` |
| **Query** | `count()` |
| **Filter** | `is:unresolved user:[me] environment:[production, staging]` |
| **Time Range** | Today |
| **Formula** | Raw count |
| **Placement** | Top-right of dashboard |

**Sentry UI Steps:**
1. Add Widget > **Big Number**
2. Query: `count()`
3. Filter: `is:unresolved user:[me]`
4. Time range: **Today**
5. Title: `My Issues Created Today`

> **Note:** `user:[me]` in Sentry matches events where the user context was set via `setUser()` or `setUserContext()`. Ensure your code sets user context after authentication.

---

#### 3.3 — My Error Frequency (7d Trend)

| Property | Value |
| -------- | ----- |
| **Chart Type** | `area` |
| **Query** | `timeseries: count()` |
| **Filter** | `is:unresolved user:[me]` |
| **Time Range** | Last 7 days |
| **Interval** | 6 hours |
| **Formula** | Cumulative area under curve |
| **Placement** | Below assigned issues table |

**Sentry UI Steps:**
1. Add Widget > **Area Chart**
2. Query: `count()`
3. Filter: `is:unresolved user:[me]`
4. Time range: **Last 7 days**
5. Resolution: **6h**
6. Title: `My Error Count — 7d`

---

#### 3.4 — My Team's Error Breakdown

| Property | Value |
| -------- | ----- |
| **Chart Type** | `pie` |
| **Query** | `count()` grouped by `tags[component]` |
| **Filter** | `environment:[production, staging] tag:team:{my-team}` |
| **Time Range** | Last 14 days |
| **Formula** | Percentage per component |
| **Placement** | Right column |

**Sentry UI Steps:**
1. Add Widget > **Pie Chart**
2. Query: `count()`
3. Group by: `tags[component]`
4. Filter: `environment:production tag:team:{my-team}`
5. Time range: **Last 14 days**
6. Title: `Team Error Breakdown — 14d`

> **Note:** Replace `{my-team}` with your team slug (e.g., `payment-team`, `auth-team`). See `sentry-alerting.md` for team tag syntax.

---

#### 3.5 — My Issues by Level

| Property | Value |
| -------- | ----- |
| **Chart Type** | `bar` |
| **Query** | `count()` grouped by `level` |
| **Filter** | `is:unresolved user:[me]` |
| **Time Range** | Last 7 days |
| **Interval** | 1 day |
| **Formula** | Stacked or grouped by level (fatal, error, warning) |
| **Placement** | Below error frequency chart |

**Sentry UI Steps:**
1. Add Widget > **Bar Chart**
2. Query: `count()`
3. Group by: `level`
4. Filter: `is:unresolved user:[me]`
5. Time range: **Last 7 days**
6. Title: `My Issues by Level — 7d`

---

#### 3.6 — Resolved vs Unresolved (My Issues)

| Property | Value |
| -------- | ----- |
| **Chart Type** | `bar` (2 series) |
| **Query** | `timeseries: count()` |
| **Filter A** | `is:resolved user:[me]` |
| **Filter B** | `is:unresolved user:[me]` |
| **Time Range** | Last 14 days |
| **Interval** | 1 day |
| **Formula** | Side-by-side bars per day |
| **Placement** | Below team breakdown |

**Sentry UI Steps:**
1. Add Widget > **Bar Chart**
2. Series A: `count()` filter `is:resolved user:[me]`
3. Series B: `count()` filter `is:unresolved user:[me]`
4. Time range: **Last 14 days**
5. Resolution: **1d**
6. Title: `Resolved vs Unresolved — 14d`

---

#### 3.7 — Issue Age (Time to Resolve)

| Property | Value |
| -------- | ----- |
| **Chart Type** | `big_number` |
| **Query** | `avg(seconds_since_first_seen)` |
| **Filter** | `is:unresolved user:[me]` |
| **Time Range** | Last 30 days |
| **Formula** | Average age in hours |
| **Placement** | Below resolved/unresolved chart |

**Sentry UI Steps:**
1. Add Widget > **Big Number**
2. Query: `avg(duration)` or `avg(exclusive_time)`
3. Alternatively, use `stats()` > **Avg Duration** for resolved issues
4. Filter: `is:resolved user:[me]`
5. Time range: **Last 30 days**
6. Title: `Avg Time to Resolve — 30d`

---

#### 3.8 — My Velocity (Issues Resolved per Week)

| Property | Value |
| -------- | ----- |
| **Chart Type** | `bar` |
| **Query** | `timeseries: count()` |
| **Filter** | `is:resolved user:[me]` |
| **Time Range** | Last 8 weeks |
| **Interval** | 1 week |
| **Formula** | Count of resolved issues per week |
| **Placement** | Bottom of dashboard |

**Sentry UI Steps:**
1. Add Widget > **Bar Chart**
2. Query: `count()`
3. Filter: `is:resolved user:[me]`
4. Time range: **Last 8 weeks**
5. Resolution: **1w**
6. Title: `My Issue Resolution Velocity — 8w`

---

#### Dashboard 3 Layout Summary

```
┌──────────────────────────┬──────────────────────────┐
│  My Assigned Issues       │  My Issues Created Today │
│  (table)                 │  (big_number)            │
├──────────────────────────┴──────────────────────────┤
│  My Error Count — 7d (area, full-width)               │
├──────────────────────────┬──────────────────────────┤
│  My Issues by Level — 7d│  Team Error Breakdown — 14d│
│  (bar)                   │  (pie)                   │
├──────────────────────────┴──────────────────────────┤
│  Resolved vs Unresolved — 14d                        │
│  (bar, full-width)                                  │
├──────────────────────────┬──────────────────────────┤
│  Avg Time to Resolve — 30d│  My Velocity — 8w      │
│  (big_number)            │  (bar)                   │
└──────────────────────────┴──────────────────────────┘
```

---

## Tag Requirements

The following Sentry tags must be set in code for dashboards to display meaningful data. See `lib/sentry.ts`, `lib/sentry/client.ts`, and `lib/sentry/server.ts` for helper functions.

| Tag Key | Set By | Example Value | Used In Dashboard |
| ------- | ------ | -------------- | ----------------- |
| `component` | `captureError()` / `captureException()` | `payment`, `auth`, `jobs`, `api` | Engineering Lead (pie), Developer (team breakdown) |
| `team` | `captureError()` extra/context | `payment-team`, `auth-team` | Developer (team breakdown) |
| `severity` | `captureError()` tags | `fatal`, `high`, `medium`, `low` | On-Call (P0/P1 table) |
| `environment` | Sentry自动设置 | `production`, `staging`, `development` | All dashboards |
| `release` | Sentry自动设置 | `1.2.3` | On-Call (deployment correlation) |
| `user.id` | `setUser()` / `setUserContext()` | `user-123` | Developer (my issues) |

### Setting Tags in Code

```typescript
import { captureError } from "@/lib/sentry/client";

// Set component and team tags for routing
captureError(error, {
  tags: {
    component: "payment",   // → maps to payment-team
    severity: "high",        // → routes to P1 alert
  },
  extra: {
    team: "payment-team",   // → maps to Developer team dashboard
  },
});
```

```typescript
import { setUser } from "@/lib/sentry/client";

// Set user context so "My Issues" works
setUser({
  id: session.user.id,
  email: session.user.email,
  username: session.user.name,
});
```

---

## Creating Dashboards in Sentry

### Step 1: Access Dashboards

1. Go to **Sentry > Dashboards** (`/organizations/{org}/dashboards/`)
2. Click **"+ Create Dashboard"**
3. Enter a name (e.g., `Engineering Lead — Production`)
4. Select **"Widget Dashboard"** layout type
5. Click **Create**

### Step 2: Add Widgets

For each widget in the templates above:

1. Click **"Add Widget"** in the dashboard editor
2. Select the **widget type** from the picker
3. Build your query using the Sentry Query Builder:
   - Use the search bar for `key:value` filters
   - Click **"Group by"** to split by a dimension (e.g., `environment`, `release`)
   - Use the **Stats** tab for MTTD/MTTR calculations
4. Set the **time range** and **resolution** interval
5. Click **Add to Dashboard**
6. Drag widgets to the correct grid position

### Step 3: Add Dashboard Filters (Optional)

1. Click **"Add Filter"** or use the **Environment** dropdown at the top
2. Pin the `environment:production` filter so all widgets default to production
3. Set **Global Time Range** to the default (e.g., Last 7 days)

### Step 4: Assign Dashboard Permissions

1. Go to the dashboard **Settings** (gear icon)
2. Under **Permissions**, choose:
   - **Organization** — all team members can view
   - **Team** — only selected teams can view/edit
   - **Only Me** — personal dashboards (Developer persona)
3. Click **Save Changes**

---

## Customization Tips

### Adding Custom Tags

If your app uses custom tags not in the default Sentry set, add them to your SDK config:

```typescript
// In sentry.server.config.ts or sentry.client.config.ts
Sentry.init({
  // ... other config
  beforeSend: (event) => {
    event.tags = {
      ...event.tags,
      region: process.env.SENTRY_ENVIRONMENT || "production",
    };
    return event;
  },
});
```

### Excluding Noisy Errors

Use **Inbound Filters** in Sentry (`Project Settings > Inbound Filters`) to exclude:
- `BrowserExtensionErrors` — browser extension errors
- `CORS errors` — cross-origin issues
- Errors below a minimum occurrence threshold

### Correlating with Deployment Events

1. Upload source maps with each release (handled by `@sentry/nextjs` via `SENTRY_AUTH_TOKEN`)
2. Tag errors with `deploy.id` by setting the release context:

```typescript
Sentry.setContext("release", {
  version: process.env.VERCEL_GIT_COMMIT_SHA || "dev",
  environment: process.env.NODE_ENV,
});
```

---

**Document Owner:** Sasha (AI Co-founder)
**Last Review:** March 31, 2026
**Next Review:** Quarterly
