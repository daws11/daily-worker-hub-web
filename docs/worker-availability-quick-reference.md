# Worker Availability System - Quick Reference

## 🚀 Quick Start

### 1. Run Database Migration

```bash
cd /home/dev/.openclaw/workspace/daily-worker-hub-clean
pnpm supabase db push
```

### 2. Test in Worker Settings

Navigate to: `/worker/settings`

- Scroll to "Ketersediaan Mingguan"
- Toggle availability for each day
- Adjust time sliders (4-12 hours)
- Click "Simpan" to save

### 3. Use in Job Matching

```typescript
import { generateWorkerShortlist } from "@/lib/algorithms/generate-shortlist";

const shortlist = await generateWorkerShortlist({
  jobSkills: ["cleaning"],
  jobLat: -6.2088,
  jobLng: 106.8456,
  jobDate: new Date("2026-02-28"),
  jobStartHour: 9,
  jobEndHour: 17,
  requiredWorkers: 3,
});
```

## 📦 Key Files

### Database

- `supabase/migrations/20260227_add_worker_availability.sql` - Database schema

### Logic

- `lib/algorithms/availability-checker.ts` - Core availability functions

### UI Components

- `components/worker/availability-slots.tsx` - Weekly availability manager
- `components/worker/availability-setup.tsx` - Setup wizard
- `components/worker/availability-calendar.tsx` - Calendar view
- `components/worker/availability-indicator.tsx` - Profile card indicator

### Integration

- `app/(dashboard)/worker/settings/page.tsx` - Settings page integration
- `lib/algorithms/generate-shortlist.ts` - Matching algorithm integration

### Documentation

- `docs/worker-availability-system.md` - Full documentation
- `docs/worker-availability-implementation-summary.md` - Implementation details

## 🎯 Key Features

✅ Daily availability blocks (4-12 hours)
✅ Monday-Sunday support
✅ Database storage
✅ 20-point matching score
✅ shadcn/ui components
✅ Simple, intuitive UI

## 📊 Matching Algorithm

Total Score: 115 points

- Skills: 30 points
- Distance: 30 points
- **Availability: 20 points** ⭐
- Rating: 15 points
- Compliance: 5 points
- Tier Bonus: 5-20 points

## 🔧 Common Functions

```typescript
// Check if worker is available
await isWorkerAvailable(workerId, date, startHour, endHour);

// Calculate availability score
await calculateAvailabilityScore(workerId, date, startHour, endHour);

// Set availability for a week
await setWorkerAvailabilityForWeek(workerId, availabilities);
```

## ⚡ Tips

- Workers with more availability get more job matches
- Minimum 4 hours per day, maximum 12 hours
- Use the setup wizard for new workers
- Check the calendar for visual overview
