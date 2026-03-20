# Caching Strategy - Daily Worker Hub

This document describes the caching implementation for improving response times for frequently accessed data.

## Overview

The Daily Worker Hub uses an **in-memory LRU (Least Recently Used) cache** with TTL (Time-To-Live) support to reduce database load and improve API response times.

## Cache Utility

Location: `lib/cache.ts`

### Core Features

- **LRU Eviction**: Automatically evicts least recently used entries when cache is full
- **TTL Support**: Each entry has a configurable time-to-live
- **Namespaced Keys**: Cache keys are organized by data type (jobs, workers, etc.)
- **Statistics**: Track hit/miss ratios and cache performance
- **Cache Bypass**: Support for bypassing cache with `?nocache=true` parameter

### Basic Usage

```typescript
import { cache, LRUCache, CACHE_TTL } from "@/lib/cache";

// Get a value
const data = cache.get("jobs:list:category-123");

// Set a value with TTL
cache.set("jobs:list:category-123", jobData, CACHE_TTL.JOBS);

// Delete a key
cache.del("jobs:list:category-123");

// Get or set pattern (recommended)
const data = await cache.getOrSet(
  "jobs:list:all",
  async () => fetchJobsFromDB(),
  CACHE_TTL.JOBS,
);
```

## Cache Namespaces

| Namespace    | Description                    | Default TTL |
| ------------ | ------------------------------ | ----------- |
| `jobs`       | Job listings and details       | 5 minutes   |
| `workers`    | Worker profiles and data       | 10 minutes  |
| `badges`     | Badge definitions and progress | 1 hour      |
| `categories` | Job categories                 | 1 hour      |
| `sessions`   | User authentication context    | 15 minutes  |

## TTL Presets

```typescript
export const CACHE_TTL = {
  JOBS: 5 * 60 * 1000, // 5 minutes
  WORKERS: 10 * 60 * 1000, // 10 minutes
  BADGES: 60 * 60 * 1000, // 1 hour
  CATEGORIES: 60 * 60 * 1000, // 1 hour
  SESSIONS: 15 * 60 * 1000, // 15 minutes
};
```

## Cache Key Patterns

### Jobs

- `jobs:list:{filters}` - Job listings with specific filters
- `jobs:{jobId}` - Individual job details

### Workers

- `workers:{workerId}:public` - Public worker profile
- `workers:{workerId}:badges` - Worker badge progress
- `workers:list:{filters}` - Worker listings

### Badges

- `badges:definitions` - All badge definitions
- `badges:worker:{workerId}:{filter}` - Worker's badges (all/earned/progress)

### Categories

- `categories:all` - All job categories

### Sessions

- `sessions:{userId}` - User session data
- `sessions:{userId}:auth` - Auth context

## Cache Invalidation

### Automatic Invalidation

Cache entries are automatically invalidated when:

1. TTL expires
2. LRU eviction occurs (when cache is full)

### Manual Invalidation Helpers

```typescript
import {
  invalidateJobCache,
  invalidateWorkerCache,
  invalidateUserCache,
  invalidateBadgeCache,
  invalidateCategoryCache
} from '@/lib/cache'

// Invalidate job caches (pass jobId for specific job, or omit for all listings)
invalidateJobCache(jobId?)

// Invalidate worker caches
invalidateWorkerCache(workerId?)

// Invalidate user session cache
invalidateUserCache(userId)

// Invalidate badge caches
invalidateBadgeCache()

// Invalidate category caches
invalidateCategoryCache()
```

### When to Invalidate

| Action                 | Cache to Invalidate               |
| ---------------------- | --------------------------------- |
| Create new job         | `invalidateJobCache()`            |
| Update job             | `invalidateJobCache(jobId)`       |
| Delete job             | `invalidateJobCache(jobId)`       |
| Worker updates profile | `invalidateWorkerCache(workerId)` |
| Worker earns badge     | `invalidateWorkerCache(workerId)` |
| User logs out          | `invalidateUserCache(userId)`     |
| Admin updates badge    | `invalidateBadgeCache()`          |
| Admin updates category | `invalidateCategoryCache()`       |

## API Routes with Caching

### 1. GET /api/jobs

**Cache Strategy:** Cache query results for 5 minutes

```typescript
// Cache key includes all filter parameters
const cacheKey = LRUCache.createKey(
  "jobs",
  "list",
  categoryId || "all",
  search || "none",
  wageMin || "0",
  wageMax || "max",
  sort || "newest",
  page || "1",
  limit || "20",
);
```

**Cache Bypass:** Add `?nocache=true` to force fresh data

### 2. GET /api/categories

**Cache Strategy:** Cache all categories for 1 hour (rarely change)

```typescript
const CATEGORIES_CACHE_KEY = LRUCache.createKey("categories", "all");
```

### 3. GET /api/workers/[id]/public

**Cache Strategy:** Cache public profile for 10 minutes

```typescript
const cacheKey = LRUCache.createKey("workers", workerId, "public");
```

### 4. GET /api/workers/badges

**Cache Strategy:** Cache badge data for 1 hour

```typescript
const cacheKey = LRUCache.createKey("badges", "worker", workerId, filter);
```

## Response Headers

Cached responses include helpful headers:

| Header        | Value           | Description                      |
| ------------- | --------------- | -------------------------------- |
| `X-Cache`     | `HIT` or `MISS` | Whether response came from cache |
| `X-Cache-Key` | `namespace:key` | The cache key used               |

## Admin Cache Management

### GET /api/admin/cache-stats

View cache statistics and performance metrics.

**Authentication:** Requires `Authorization: Bearer {ADMIN_API_SECRET}`

**Response:**

```json
{
  "stats": {
    "hits": 1500,
    "misses": 200,
    "size": 85,
    "maxSize": 2000,
    "hitRate": 0.88,
    "hitRatePercent": "88%"
  },
  "entriesByNamespace": {
    "jobs": [...],
    "workers": [...],
    "categories": [...]
  },
  "totalEntries": 85,
  "timestamp": "2026-03-19T01:00:00.000Z"
}
```

### DELETE /api/admin/cache-stats

Clear cache entries.

**Query Parameters:**

- `namespace` - Clear specific namespace (jobs, workers, badges, categories, sessions)
- `key` - Clear specific cache key
- `workerId` - Clear all caches for a worker
- `jobId` - Clear all caches for a job
- `userId` - Clear user session cache

**Examples:**

```bash
# Clear all cache
DELETE /api/admin/cache-stats

# Clear jobs cache only
DELETE /api/admin/cache-stats?namespace=jobs

# Clear specific worker's cache
DELETE /api/admin/cache-stats?workerId=abc-123
```

### POST /api/admin/cache-stats

Warm up cache (placeholder for future implementation).

## Performance Considerations

### Cache Size

- Default max size: **2000 entries**
- Estimated memory: ~10-50MB depending on data size
- LRU eviction ensures memory stays bounded

### Hit Rate Targets

| Endpoint                 | Target Hit Rate |
| ------------------------ | --------------- |
| /api/jobs                | > 70%           |
| /api/categories          | > 90%           |
| /api/workers/[id]/public | > 60%           |
| /api/workers/badges      | > 50%           |

### Monitoring

Monitor cache performance through:

1. Admin stats endpoint
2. Response headers (`X-Cache`)
3. Application logs

## Best Practices

1. **Use cache bypass for debugging:** Add `?nocache=true` when testing
2. **Invalidate on writes:** Always invalidate related caches after mutations
3. **Monitor hit rates:** Low hit rates may indicate TTL is too short
4. **Namespace appropriately:** Use clear, consistent cache key patterns
5. **Handle cache misses gracefully:** Always have a fallback fetcher

## Future Improvements

1. **Redis integration:** For distributed caching across multiple instances
2. **Cache warming:** Pre-populate cache on server startup
3. **Tag-based invalidation:** Group related cache entries for batch invalidation
4. **Compression:** Compress large cache entries to save memory
5. **Metrics export:** Export cache metrics to monitoring systems (Prometheus, etc.)
