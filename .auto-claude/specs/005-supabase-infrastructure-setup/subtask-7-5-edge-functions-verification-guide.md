# Edge Functions Verification Guide
**Subtask 7-5: Verify Edge Functions can be deployed and invoked**

## Overview

This guide verifies that Supabase Edge Functions are properly configured and can be deployed, invoked, and debugged. The primary test function is the **reliability-score** function.

---

## Edge Function Overview

### Function: `reliability-score`

**Location:** `supabase/functions/reliability-score/index.ts`

**Purpose:** Calculate worker reliability scores based on:
- Booking completion rate (50% weight)
- Average rating from reviews (50% weight)
- Recent activity (last 90 days)

**API Endpoint:** `POST /functions/v1/reliability-score`

**Request Body:**
```json
{
  "worker_id": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "worker_id": "uuid",
  "reliability_score": 4.25,
  "metrics": {
    "total_bookings": 10,
    "completed_bookings": 8,
    "completion_rate": 80.0,
    "total_reviews": 5,
    "avg_rating": 4.5,
    "period_days": 90
  }
}
```

**Score Formula:**
- Completion Rate % × 0.5 + (Avg Rating / 5 × 100) × 0.5 = Raw Score (0-100)
- Normalized Score: Raw Score / 20 = Scale (1-5)

---

## Prerequisites

1. **Supabase Local Running**
   ```bash
   npx supabase@latest start
   ```

2. **Database Migrations Applied**
   ```bash
   npx supabase@latest db reset
   ```

3. **Seed Data Loaded** (for testing)
   - Workers table should have records
   - Bookings table should have records
   - Reviews table should have records

4. **Environment Variables Set**
   - `SUPABASE_URL` (automatically set by Supabase Local)
   - `SUPABASE_SERVICE_ROLE_KEY` (automatically set by Supabase Local)

---

## Verification Steps

### Step 1: Verify Edge Functions Service is Running

```bash
# Check Supabase status
npx supabase@latest status

# Expected output should include:
# supabase_edge_functions ... running on port 54321
```

**Alternative Check:**
```bash
# List all Docker containers
docker ps | grep supabase_edge_functions

# Expected: Container named "005-supabase-infrastructure-setup_edge_functions" is running
```

---

### Step 2: Deploy Edge Function

```bash
# Deploy the reliability-score function
npx supabase@latest functions deploy reliability-score

# Expected output:
# • Deployed reliability-score function.
```

**Note:** When running Supabase Local, functions are automatically available without deployment. The `functions deploy` command is primarily for cloud deployment.

---

### Step 3: Invoke Edge Function via cURL

#### Test 1: Valid Worker ID (with seed data)

```bash
# Using a worker ID from seed data
curl -X POST \
  http://localhost:54321/functions/v1/reliability-score \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  -d '{
    "worker_id": "w0022222-2222-2222-2222-222222222201"
  }'

# Expected Response:
# {
#   "success": true,
#   "worker_id": "w0022222-2222-2222-2222-222222222201",
#   "reliability_score": 3.0,
#   "metrics": {
#     "total_bookings": 2,
#     "completed_bookings": 1,
#     "completion_rate": 50.0,
#     "total_reviews": 1,
#     "avg_rating": 4.5,
#     "period_days": 90
#   }
# }
```

#### Test 2: Missing Worker ID (Error Case)

```bash
curl -X POST \
  http://localhost:54321/functions/v1/reliability-score \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  -d '{}'

# Expected Response (400):
# {
#   "error": "worker_id is required"
# }
```

#### Test 3: Invalid Worker ID (Error Case)

```bash
curl -X POST \
  http://localhost:54321/functions/v1/reliability-score \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0" \
  -d '{
    "worker_id": "00000000-0000-0000-0000-000000000000"
  }'

# Expected Response (200, but with zero bookings/reviews):
# {
#   "success": true,
#   "worker_id": "00000000-0000-0000-0000-000000000000",
#   "reliability_score": 3.0,
#   "metrics": {
#     "total_bookings": 0,
#     "completed_bookings": 0,
#     "completion_rate": 100.0,
#     "total_reviews": 0,
#     "avg_rating": 3.0,
#     "period_days": 90
#   }
# }
```

#### Test 4: OPTIONS Request (CORS Preflight)

```bash
curl -X OPTIONS \
  http://localhost:54321/functions/v1/reliability-score \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: POST" \
  -v

# Expected Response (200):
# Status: 200 OK
# Access-Control-Allow-Origin: *
# Access-Control-Allow-Headers: authorization, x-client-info, apikey, content-type
```

---

### Step 4: Check Function Logs

```bash
# View Edge Functions logs
npx supabase@latest functions logs reliability-score

# Or stream logs in real-time
npx supabase@latest functions logs reliability-score --tail
```

**Expected Log Output:**
```
[INFO] Processing request for worker_id: w0022222-2222-2222-2222-222222222201
[INFO] Fetched 2 bookings, 1 reviews
[INFO] Completion rate: 50.0%, Avg rating: 4.5
[INFO] Calculated reliability score: 3.0
```

---

### Step 5: Verify Database Queries (Optional)

Connect to Studio UI and run these queries to verify the function's data access:

```sql
-- Get bookings for a worker (last 90 days)
SELECT id, status, created_at
FROM bookings
WHERE worker_id = 'w0022222-2222-2222-2222-222222222201'
  AND created_at >= NOW() - INTERVAL '90 days'
ORDER BY created_at DESC;

-- Get reviews for a worker
SELECT id, rating, comment, created_at
FROM reviews
WHERE worker_id = 'w0022222-2222-2222-2222-222222222201'
ORDER BY created_at DESC;

-- Calculate manually to verify function output
SELECT
  COUNT(*) as total_bookings,
  COUNT(*) FILTER (WHERE status = 'completed') as completed_bookings,
  ROUND(
    (COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / NULLIF(COUNT(*), 0)) * 100,
    2
  ) as completion_rate
FROM bookings
WHERE worker_id = 'w0022222-2222-2222-2222-222222222201'
  AND created_at >= NOW() - INTERVAL '90 days';
```

---

## Testing Checklist

- [ ] Edge Functions service is running (`docker ps | grep edge_functions`)
- [ ] Function can be invoked via cURL
- [ ] Valid worker_id returns proper score
- [ ] Missing worker_id returns 400 error
- [ ] CORS headers are present in response
- [ ] Function logs show processing details
- [ ] Score calculation matches manual verification
- [ ] Error handling works for database errors
- [ ] Response time is acceptable (< 2 seconds)

---

## Common Issues and Solutions

### Issue 1: "Function not found" Error

**Symptoms:**
```
Error: Function 'reliability-score' not found
```

**Solution:**
```bash
# Verify function file exists
ls -la supabase/functions/reliability-score/index.ts

# Restart Supabase Local
npx supabase@latest stop
npx supabase@latest start
```

---

### Issue 2: "Unauthorized" Error

**Symptoms:**
```
401 Unauthorized
```

**Solution:**
```bash
# Verify you're using the correct anon key for local development
# Get the anon key from:
npx supabase@latest status

# Local dev anon key (default):
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0
```

---

### Issue 3: Database Connection Error

**Symptoms:**
```
Error: Failed to fetch bookings: connection refused
```

**Solution:**
```bash
# Verify database is running
npx supabase@latest status

# Check database container
docker ps | grep supabase_db

# If needed, restart database
npx supabase@latest stop
npx supabase@latest start
```

---

### Issue 4: "No Data Returned" (All Zero Metrics)

**Symptoms:**
```json
{
  "metrics": {
    "total_bookings": 0,
    "completed_bookings": 0,
    "total_reviews": 0
  }
}
```

**Solution:**
```bash
# Verify seed data is loaded
npx supabase@latest db reset

# Or manually check via Studio UI:
# 1. Open http://localhost:54323
# 2. Navigate to Table Editor > bookings
# 3. Verify records exist
```

---

### Issue 5: CORS Errors from Browser

**Symptoms:**
```
Access to fetch at 'http://localhost:54321/functions/v1/reliability-score'
from origin 'http://localhost:3000' has been blocked by CORS policy
```

**Solution:**
- Verify CORS headers are present in function response
- Check that `Access-Control-Allow-Origin: *` is set
- For production, change `*` to specific origin

---

## Performance Considerations

### Current Function Performance

- **Expected Response Time:** 100-500ms (local)
- **Database Queries:** 2 queries (bookings + reviews)
- **Time Window:** Last 90 days (indexed by `created_at`)

### Optimization Opportunities

1. **Add Indexes** (if not already present):
   ```sql
   CREATE INDEX IF NOT EXISTS idx_bookings_worker_created
   ON bookings(worker_id, created_at DESC);

   CREATE INDEX IF NOT EXISTS idx_reviews_worker
   ON reviews(worker_id);
   ```

2. **Cache Results** (future enhancement):
   - Store calculated score in `workers.reliability_score` column
   - Update via trigger or scheduled job
   - Return cached value for faster responses

3. **Batch Processing** (future enhancement):
   - Calculate scores for all workers at once
   - Useful for leaderboards or rankings

---

## Security Best Practices

### Current Implementation

✅ **Secure:**
- Uses service role key for admin database access
- Input validation (worker_id required)
- No SQL injection risk (Supabase client parameterized queries)
- CORS headers configured

⚠️ **Recommendations for Production:**

1. **Add Authentication:**
   ```typescript
   // Require user to be logged in
   const authHeader = req.headers.get('Authorization')
   if (!authHeader) {
     return new Response('Unauthorized', { status: 401 })
   }

   // Verify user can only access their own data
   // or is admin/business owner
   ```

2. **Rate Limiting:**
   - Implement request rate limiting
   - Prevent abuse/DoS attacks

3. **Audit Logging:**
   - Log all function invocations
   - Track who requested scores for which workers

---

## Integration with Frontend

### Example: Calling from Next.js

```typescript
// lib/api/reliability-score.ts
import { createClient } from '@/lib/supabase/client'

export async function getReliabilityScore(workerId: string) {
  const supabase = createClient()

  // Get session
  const { data: { session } } = await supabase.auth.getSession()

  const response = await fetch(
    `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/reliability-score`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session?.access_token || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ worker_id: workerId }),
    }
  )

  if (!response.ok) {
    throw new Error('Failed to fetch reliability score')
  }

  return response.json()
}
```

### Usage in React Component

```tsx
// app/workers/[id]/page.tsx
'use client'

import { useEffect, useState } from 'react'
import { getReliabilityScore } from '@/lib/api/reliability-score'

export function WorkerReliabilityScore({ workerId }: { workerId: string }) {
  const [score, setScore] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getReliabilityScore(workerId)
      .then(data => setScore(data.reliability_score))
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [workerId])

  if (loading) return <div>Loading...</div>

  return (
    <div className="reliability-score">
      <h3>Reliability Score</h3>
      <div className="score">{score?.toFixed(1)} / 5.0</div>
    </div>
  )
}
```

---

## Next Steps

1. **Add Persistence** (optional):
   - Add `reliability_score` column to `workers` table
   - Update the score when function is called
   - Uncomment the update code in the function

2. **Create More Functions**:
   - `search-workers` - Search and filter workers
   - `booking-reminder` - Send booking reminders
   - `review-summary` - Aggregate review summaries
   - `worker-match` - Match workers to jobs

3. **Monitoring**:
   - Add structured logging
   - Track invocation metrics
   - Set up alerts for errors

4. **Testing**:
   - Add unit tests for calculation logic
   - Add integration tests for API endpoints
   - Mock database responses

---

## Additional Resources

- [Supabase Edge Functions Docs](https://supabase.com/docs/guides/functions)
- [Deno Runtime Docs](https://deno.land/manual)
- [Supabase Client for Deno](https://github.com/supabase/supabase-js#deno)
- [CORS Guide](https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS)

---

## Summary

This verification guide covers:

✅ Edge Functions service deployment
✅ Function invocation via cURL
✅ Request/response validation
✅ Error handling verification
✅ Log checking
✅ Database query verification
✅ Common issues and solutions
✅ Security best practices
✅ Frontend integration examples

**Status:** Ready for runtime verification when Docker is available in the main project.
