# Monitoring Dashboard

Real-time system monitoring and metrics dashboard for Daily Worker Hub administrators.

## Access

**URL:** `/admin/monitoring`

**Authentication:** Requires admin authentication. You'll be prompted to enter the admin API secret on first access.

## Overview

The monitoring dashboard provides real-time insights into:

- **System Health**: CPU, memory, uptime
- **API Performance**: Response times, error rates
- **User Activity**: Active users, engagement metrics
- **Cache Performance**: Hit rates, cache size
- **Rate Limiting**: Request counts, blocked requests
- **Database**: Connection pool, query performance

## Metrics Explained

### API Response Time

- **Average**: Mean response time across all API requests
- **P95**: 95th percentile - 95% of requests are faster than this
- **P99**: 99th percentile - 99% of requests are faster than this
- **Target**: Average < 200ms, P95 < 500ms, P99 < 1000ms

### Error Rate

- **Errors per Minute**: Current error rate
- **24h Total**: Total errors in the last 24 hours
- **Error Types**: Breakdown by error category (Network, Validation, Auth, Database, Other)
- **Trend**: Hourly error count over 24 hours

**Good**: < 0.1 errors/min  
**Warning**: 0.1-1 errors/min  
**Critical**: > 1 errors/min

### Cache Performance

- **Hit Rate**: Percentage of cache requests served from cache
- **Size**: Number of cached entries
- **Max Size**: Maximum cache capacity
- **Target**: > 80% hit rate

### Active Users

- **Currently Online**: Users with active sessions
- **Daily Active (DAU)**: Unique users in last 24 hours
- **Weekly Active (WAU)**: Unique users in last 7 days
- **Monthly Active (MAU)**: Unique users in last 30 days

### Rate Limiting

- **Total Requests**: All tracked requests
- **Blocked Requests**: Requests rejected due to rate limits
- **By Type**: Breakdown by endpoint category:
  - **Auth**: Login/register endpoints (5 req/min)
  - **API Authenticated**: Authenticated API calls (100 req/min)
  - **API Public**: Public API calls (30 req/min)
  - **Payment**: Payment endpoints (10 req/min)
- **Top Endpoints**: Most frequently accessed endpoints

### Database

- **Connection Pool**: Active database connections
- **Max Connections**: Maximum allowed connections
- **Average Query Time**: Mean query execution time
- **Slow Queries**: Recent queries exceeding 500ms
- **Target**: < 70% connection usage, < 100ms avg query time

## Real-Time Updates

The dashboard automatically refreshes every **30 seconds**. You can also manually refresh using the "Refresh" button in the header.

The "Last Updated" timestamp shows when metrics were last fetched.

## Status Indicators

Health status badges use color coding:

- 🟢 **Healthy** (Green): Normal operation
- 🟡 **Warning** (Yellow): Attention needed
- 🔴 **Critical** (Red): Immediate action required

## Setting Up Admin API Secret

To access the monitoring dashboard, you need an admin API secret:

1. Set the `ADMIN_API_SECRET` environment variable in your `.env.local`:

```bash
ADMIN_API_SECRET=your-secure-secret-here
```

2. When accessing `/admin/monitoring`, enter the same secret when prompted

3. The secret is stored in localStorage for future visits

**Security Note:** Keep the admin API secret confidential. It provides access to sensitive system metrics.

## API Endpoint

The monitoring dashboard fetches data from:

```
GET /api/admin/metrics
Authorization: Bearer <ADMIN_API_SECRET>
```

### Response Format

```json
{
  "timestamp": "2024-03-19T02:13:00.000Z",
  "system": { ... },
  "cache": { ... },
  "rateLimit": { ... },
  "api": { ... },
  "errors": { ... },
  "users": { ... },
  "database": { ... }
}
```

## Troubleshooting

### "Error loading metrics"

- Verify your admin API secret is correct
- Check that `ADMIN_API_SECRET` is set in `.env.local`
- Ensure the API endpoint is accessible

### Stale Metrics

- Click the "Refresh" button to manually update
- Check browser console for errors
- Verify network connectivity

### Missing Data

Some metrics are currently using mock data:
- API response times
- Error rates (Sentry integration pending)
- Active users (session tracking pending)
- Database metrics (connection pool monitoring pending)

## Future Enhancements

- [ ] Sentry integration for real error tracking
- [ ] Session store integration for accurate user counts
- [ ] Database connection pool monitoring
- [ ] Customizable refresh intervals
- [ ] Alert thresholds and notifications
- [ ] Historical metrics comparison
- [ ] Export metrics to CSV/JSON

## Architecture

```
┌─────────────────────────────────────┐
│  Monitoring Dashboard (React)       │
│  - SWR for data fetching            │
│  - Recharts for visualizations      │
│  - 30s auto-refresh                 │
└──────────────┬──────────────────────┘
               │
               ▼
┌─────────────────────────────────────┐
│  /api/admin/metrics                 │
│  - Collects metrics from:           │
│    - Cache stats                    │
│    - Rate limiting                  │
│    - System health (os module)      │
│    - (Mock data for APM)            │
└─────────────────────────────────────┘
```

## Dependencies

- **SWR**: Data fetching with automatic refresh
- **Recharts**: Chart library for visualizations
- **Lucide Icons**: Icon library
- **shadcn/ui**: UI components (Card, Badge, Button, etc.)

## Related Documentation

- [Admin Dashboard Overview](../README.md#admin-dashboard)
- [Rate Limiting Configuration](../lib/rate-limit.ts)
- [Cache Implementation](../lib/cache.ts)
- [API Documentation](../app/api/README.md)
