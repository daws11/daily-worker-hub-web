# Worker Availability System

## Overview

The Worker Availability System allows workers to set their weekly availability, which is then used in the matching algorithm to assign jobs to workers who are available during the required time period.

## Features

- **Daily Availability Blocks**: Workers can set availability for each day of the week (Monday-Sunday)
- **4-12 Hour Blocks**: Each day's availability must be a continuous block of 4-12 hours
- **Database Storage**: Availability data is stored in PostgreSQL, not localStorage
- **Matching Integration**: Availability score (0-20 points) is part of the matching algorithm
- **Simple UI**: Intuitive components for setting and managing availability

## Database Schema

### `worker_availabilities` Table

```sql
CREATE TABLE worker_availabilities (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  worker_id UUID NOT NULL REFERENCES workers(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK (day_of_week >= 1 AND day_of_week <= 7),
  start_hour INTEGER NOT NULL CHECK (start_hour >= 0 AND start_hour <= 23),
  end_hour INTEGER NOT NULL CHECK (end_hour >= 0 AND end_hour <= 23),
  is_available BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(worker_id, day_of_week),
  CHECK (end_hour > start_hour),
  CHECK (end_hour - start_hour >= 4 AND end_hour - start_hour <= 12)
);
```

#### Fields

- `id`: Unique identifier
- `worker_id`: Reference to the worker
- `day_of_week`: Day of week (1=Monday, 2=Tuesday, ..., 7=Sunday)
- `start_hour`: Start hour in 24-hour format (0-23)
- `end_hour`: End hour in 24-hour format (0-23)
- `is_available`: Whether worker is available on this day
- `created_at`: Timestamp when record was created
- `updated_at`: Timestamp when record was last updated

#### Constraints

- Each worker can have only one availability record per day
- End hour must be after start hour
- Availability block must be 4-12 hours

## API Functions

### `availability-checker.ts`

Core functions for checking and managing worker availability:

#### `isWorkerAvailable(workerId, date, jobStartHour, jobEndHour)`

Check if a worker is available for a specific time period.

```typescript
const isAvailable = await isWorkerAvailable(
  workerId,
  new Date('2026-02-28'), // Job date
  9, // 9:00 AM
  17 // 5:00 PM
);
```

#### `calculateAvailabilityScore(workerId, date, jobStartHour, jobEndHour)`

Calculate availability score for matching algorithm (0-20 points).

```typescript
const score = await calculateAvailabilityScore(
  workerId,
  new Date('2026-02-28'),
  9,
  17
); // Returns 20 if available, 0 if not
```

#### `setWorkerAvailability(workerId, dayOfWeek, startHour, endHour, isAvailable)`

Set or update a worker's availability for a specific day.

```typescript
const result = await setWorkerAvailability(
  workerId,
  1, // Monday
  9, // 9:00 AM
  17, // 5:00 PM
  true
);
```

#### `setWorkerAvailabilityForWeek(workerId, availabilities)`

Set availability for all days at once.

```typescript
const result = await setWorkerAvailabilityForWeek(workerId, [
  { dayOfWeek: 1, startHour: 9, endHour: 17, isAvailable: true },
  { dayOfWeek: 2, startHour: 9, endHour: 17, isAvailable: true },
  { dayOfWeek: 3, startHour: 9, endHour: 17, isAvailable: true },
  { dayOfWeek: 4, startHour: 9, endHour: 17, isAvailable: true },
  { dayOfWeek: 5, startHour: 9, endHour: 17, isAvailable: true },
  { dayOfWeek: 6, startHour: 0, endHour: 0, isAvailable: false },
  { dayOfWeek: 7, startHour: 0, endHour: 0, isAvailable: false },
]);
```

## UI Components

### `AvailabilitySlots`

Main component for setting weekly availability.

```tsx
import { AvailabilitySlots } from "@/components/worker/availability-slots"

<AvailabilitySlots
  slots={availabilitySlots}
  onSlotToggle={(dayOfWeek) => handleToggle(dayOfWeek)}
  onSlotTimeChange={(dayOfWeek, start, end) => handleChange(dayOfWeek, start, end)}
  disabled={isSaving}
/>
```

### `AvailabilitySetup`

Setup wizard for new workers.

```tsx
import { AvailabilitySetup } from "@/components/worker/availability-setup"

<AvailabilitySetup
  onComplete={(availabilities) => handleComplete(availabilities)}
  existingData={existingAvailabilities}
  isLoading={isLoading}
/>
```

### `AvailabilityCalendar`

Calendar view for visualizing and selecting availability.

```tsx
import { AvailabilityCalendar } from "@/components/worker/availability-calendar"

<AvailabilityCalendar
  selectedDate={selectedDate}
  onDateSelect={setSelectedDate}
  availableDates={availableDates}
/>
```

### `AvailabilityIndicator`

Simple indicator for worker profile cards.

```tsx
import { AvailabilityIndicator, AvailabilityBadge } from "@/components/worker/availability-indicator"

// Full indicator
<AvailabilityIndicator
  isAvailable={true}
  availableDays={5}
  averageHours={8}
  compact={false}
/>

// Compact badge
<AvailabilityBadge
  isAvailable={true}
  daysAvailable={5}
/>
```

## Integration with Matching Algorithm

The availability score is part of the 5-point matching algorithm:

1. Skill Compatibility (30 points)
2. Distance/Location (30 points)
3. **Availability (20 points)** ← New!
4. Rating & Reliability (15 points)
5. Compliance (5 points)
6. Tier Bonus (5-20 points)
7. **Total: 115 max points**

### Scoring

- **20 points**: Worker is available for the full job duration
- **0 points**: Worker is not available or availability doesn't cover job time

### Integration Points

1. **Job Posting**: When posting a job, the system filters workers by availability
2. **Worker Shortlist**: `generateWorkerShortlist()` now checks actual availability
3. **Matching Score**: `calculateAvailabilityScore()` is called for each worker

```typescript
// Updated ShortlistParams interface
export interface ShortlistParams {
  jobId?: string;
  jobSkills: string[];
  jobLat: number;
  jobLng: number;
  jobDate: Date; // NEW: Job start date
  jobStartHour: number; // NEW: Job start hour
  jobEndHour: number; // NEW: Job end hour
  requiredWorkers: number;
  excludeWorkerIds?: string[];
  minScore?: number;
}
```

## Worker Settings Integration

Availability settings are integrated into the worker settings page at `/worker/settings`:

```tsx
// app/(dashboard)/worker/settings/page.tsx

import { AvailabilitySlots } from "@/components/worker/availability-slots"
import { setWorkerAvailabilityForWeek } from "@/lib/algorithms/availability-checker"

// State management
const [availabilitySlots, setAvailabilitySlots] = useState<AvailabilitySlot[]>(...)

// Save handler
const handleAvailabilitySave = async () => {
  const result = await setWorkerAvailabilityForWeek(workerId, availabilities)
  // Handle result
}
```

## Database Functions

### `check_worker_availability(worker_id, day_of_week, job_start_hour, job_end_hour)`

PostgreSQL function to check if worker is available.

```sql
SELECT check_worker_availability(
  'worker-id',
  1, -- Monday
  9, -- 9:00 AM
  17 -- 5:00 PM
); -- Returns TRUE or FALSE
```

### `calculate_availability_score(worker_id, day_of_week, job_start_hour, job_end_hour)`

PostgreSQL function to calculate availability score.

```sql
SELECT calculate_availability_score(
  'worker-id',
  1,
  9,
  17
); -- Returns 20 or 0
```

## Indexes

The following indexes are created for optimal query performance:

```sql
-- Worker availability lookups
CREATE INDEX idx_worker_availabilities_worker_id
  ON worker_availabilities(worker_id);

-- Day-based queries
CREATE INDEX idx_worker_availabilities_day_of_week
  ON worker_availabilities(day_of_week);

-- Available workers by day and time
CREATE INDEX idx_worker_availabilities_available_day_time
  ON worker_availabilities(day_of_week, start_hour, end_hour)
  WHERE is_available = true;

-- Matching queries
CREATE INDEX idx_worker_availabilities_matching
  ON worker_availabilities(worker_id, day_of_week, is_available)
  WHERE is_available = true;
```

## Migration

To add the availability system to your database:

```bash
# Run the migration
npx supabase db push

# Or manually apply the SQL
psql -f supabase/migrations/20260227_add_worker_availability.sql
```

## Testing

### Unit Tests

```typescript
// Test availability validation
import { validateAvailabilityBlock } from '@/lib/algorithms/availability-checker'

const result = validateAvailabilityBlock(9, 17)
console.log(result) // { valid: true }

const invalid = validateAvailabilityBlock(9, 12)
console.log(invalid) // { valid: false, error: 'Availability must be at least 4 hours' }
```

### Integration Tests

```typescript
// Test full availability flow
const workerId = 'test-worker-id'

// Set availability
await setWorkerAvailabilityForWeek(workerId, [
  { dayOfWeek: 1, startHour: 9, endHour: 17, isAvailable: true },
  // ... other days
])

// Check availability
const isAvailable = await isWorkerAvailable(
  workerId,
  new Date('2026-02-28'), // Friday (day 5)
  9,
  17
)

console.log(isAvailable) // true
```

## Future Enhancements

Potential improvements to consider:

1. **Multiple Blocks per Day**: Allow workers to set multiple availability blocks per day
2. **Break Times**: Include break times in availability
3. **Recurring Exceptions**: Handle holidays or special events
4. **Availability Sharing**: Share availability with other workers for shifts
5. **Availability Requests**: Allow businesses to request availability for specific times
6. **Analytics**: Track availability patterns and suggest optimal schedules

## Troubleshooting

### Common Issues

**Issue**: Workers not showing up in shortlist even though they're available

**Solution**:
- Check that `isAvailable` is set to `true` in the database
- Verify that the job's day of week matches the worker's availability
- Ensure the job time falls within the worker's availability block

**Issue**: Validation errors when setting availability

**Solution**:
- Check that start hour < end hour
- Verify duration is between 4-12 hours
- Ensure hours are in 24-hour format (0-23)

**Issue**: Availability score not updating

**Solution**:
- Verify the worker has a `worker_availabilities` record
- Check that the `is_available` flag is true
- Ensure the job date and time parameters are correct

## Support

For issues or questions about the Worker Availability System:
- Check this documentation
- Review the code comments in `availability-checker.ts`
- Test the database functions in Supabase SQL Editor
- Check the browser console for frontend errors
