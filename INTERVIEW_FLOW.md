# Tier-Based Interview Process

## Overview

The Daily Worker Hub now implements a tier-based interview process that scales the interview requirements based on worker reputation and performance. Higher-tier workers enjoy a frictionless hiring experience, while lower-tier workers go through a vetting process.

## Interview Flow by Tier

### Champion (Tier 4) & Elite (Tier 3)

- **Type:** Instant Dispatch
- **Interview Required:** No
- **Time-to-Hire:** <5 minutes
- **Process:** Click → Instant Booking
- **Badge:** "Instant Dispatch" badge displayed

### Pro (Tier 2)

- **Type:** Chat Interview
- **Interview Required:** Yes (Chat)
- **Voice Call:** Optional (3-5 min)
- **Chat Duration:** 5-10 minutes (minimum 5 min)
- **Time-to-Hire:** ~20 minutes
- **Process:** Click → Chat (5-10 min) → Optional Voice → Booking

### Classic (Tier 1)

- **Type:** Chat + Voice Interview
- **Interview Required:** Yes (Chat + Voice)
- **Voice Call:** Required (3-5 min)
- **Chat Duration:** 5-10 minutes (minimum 5 min)
- **Voice Duration:** 3-5 minutes (minimum 3 min)
- **Total Duration:** 10-15 minutes
- **Time-to-Hire:** ~25 minutes
- **Process:** Click → Chat → Voice Call → Booking

## Components

### Core Logic (`lib/algorithms/interview-flow.ts`)

Main algorithms for interview flow:

- `getInterviewConfig(tier)` - Get interview requirements for a tier
- `isInterviewRequired(tier)` - Check if interview is required
- `isVoiceCallRequired(tier)` - Check if voice call is required
- `isVoiceCallOptional(tier)` - Check if voice call is optional
- `canInstantDispatch(tier)` - Check if worker qualifies for instant dispatch
- `createInterviewSession(...)` - Create a new interview session
- `isInterviewComplete(session)` - Check if interview is complete
- `getInterviewProgress(session)` - Get interview progress (0-100%)
- `getChatDurationMinutes(session)` - Get chat duration in minutes
- `getVoiceDurationMinutes(session)` - Get voice duration in minutes
- `formatDuration(seconds)` - Format seconds to human-readable string
- `calculateTimeToHire(jobPostedAt, bookingAcceptedAt)` - Calculate time-to-hire

### UI Components

#### `components/messaging/interview-chat.tsx`

Main interview chat interface with:

- Real-time messaging
- Voice call integration
- Interview timer
- Progress tracking
- Completion controls

#### `components/messaging/voice-call-button.tsx`

Voice call button with states:

- Idle
- Calling
- Incoming
- Connected (with mute/speaker controls)
- Ended

#### `components/messaging/interview-timer.tsx`

Interview timer component with:

- Real-time countdown
- Minimum duration requirement display
- Progress bar
- Multiple variants (default, compact, minimal)

#### `components/business/instant-dispatch-badge.tsx`

Badge for instant dispatch workers:

- Green with lightning icon
- Size variants (sm, md, lg)
- Outline/default variants

### Updated Components

#### `components/matching/worker-shortlist.tsx`

Updated to show:

- Interview type per worker tier
- Instant Dispatch badge for Elite/Champion
- "Instant Book" button for high-tier workers

## Server Actions (`lib/actions/bookings.ts`)

### Interview Session Management

- `createInterviewSession(bookingId, businessId, workerId, workerTier)` - Create new session
- `startInterviewSession(interviewSessionId, userId)` - Start interview
- `startChatInterview(interviewSessionId, userId)` - Start chat phase
- `completeChatInterview(interviewSessionId, userId)` - Complete chat phase
- `startVoiceCallInterview(interviewSessionId, userId)` - Start voice call
- `completeVoiceCallInterview(interviewSessionId, userId)` - Complete voice call
- `completeInterviewSession(interviewSessionId, userId)` - Complete entire interview
- `cancelInterviewSession(interviewSessionId, userId)` - Cancel interview

### Analytics

- `getInterviewSessionByBooking(bookingId)` - Get session by booking
- `incrementInterviewMessageCount(interviewSessionId)` - Track messages sent
- `calculateBookingTimeToHire(bookingId)` - Calculate time-to-hire metric

## Database Schema

### `interview_sessions` Table

```sql
CREATE TABLE interview_sessions (
  id UUID PRIMARY KEY,
  booking_id UUID REFERENCES bookings(id),
  business_id UUID REFERENCES businesses(id),
  worker_id UUID REFERENCES workers(id),
  worker_tier worker_tier NOT NULL,
  status TEXT CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped', 'failed')),
  type TEXT CHECK (type IN ('none', 'chat', 'chat_and_voice')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  chat_started_at TIMESTAMPTZ,
  chat_completed_at TIMESTAMPTZ,
  voice_started_at TIMESTAMPTZ,
  voice_completed_at TIMESTAMPTZ,
  chat_duration INTEGER, -- seconds
  voice_duration INTEGER, -- seconds
  total_duration INTEGER, -- seconds
  messages_sent INTEGER DEFAULT 0,
  voice_call_initiated BOOLEAN DEFAULT FALSE,
  time_to_hire NUMERIC(10,2), -- minutes
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### `bookings` Table (Updated)

Added columns:

- `interview_status` - Interview status
- `interview_duration` - Duration in seconds
- `time_to_hire` - Time-to-hire in minutes

## Usage Example

### Creating a Booking with Interview

```typescript
import { createInterviewSession } from "@/lib/actions/bookings";
import { canInstantDispatch } from "@/lib/algorithms/interview-flow";

async function selectWorker(worker: WorkerWithScore, job: Job) {
  // Create booking
  const booking = await createBooking(job.id, worker.id, businessId);

  // Create interview session
  const { data: session } = await createInterviewSession(
    booking.id,
    businessId,
    worker.id,
    worker.tier,
  );

  // If instant dispatch, complete immediately
  if (canInstantDispatch(worker.tier)) {
    await completeInterviewSession(session.id, businessId);
    // Navigate to booking confirmation
  } else {
    // Navigate to interview chat interface
    router.push(`/interview/${session.id}`);
  }
}
```

### Using Interview Chat Component

```typescript
import { InterviewChat } from '@/components/messaging/interview-chat'
import { getInterviewSessionByBooking } from '@/lib/actions/bookings'
import { getBookingMessages } from '@/lib/actions/messages'

export default async function InterviewPage({ params }: { params: { id: string } }) {
  const { data: session } = await getInterviewSessionByBooking(params.id)
  const { data: messages } = await getBookingMessages(params.id)

  return (
    <InterviewChat
      interviewSession={session}
      workerName="John Doe"
      workerTier="pro"
      businessName="ABC Company"
      currentUserId={currentUser.id}
      isBusiness={true}
      messages={messages}
      onSendMessage={sendMessage}
      onStartVoiceCall={startCall}
      onEndVoiceCall={endCall}
      onCompleteInterview={completeInterview}
      onCancelInterview={cancelInterview}
    />
  )
}
```

## Interview Status Flow

```
pending → in_progress → completed
                     ↘ failed
```

For instant dispatch workers:

```
skipped (created as skipped)
```

## Analytics & Metrics

The system tracks the following metrics for optimization:

- **Time-to-Hire:** Time from job posting to booking acceptance (in minutes)
- **Chat Duration:** Length of chat interview (in seconds)
- **Voice Duration:** Length of voice call (in seconds)
- **Total Duration:** Total interview duration (in seconds)
- **Messages Sent:** Number of messages exchanged during interview
- **Interview Status:** Current status (pending, in_progress, completed, skipped, failed)

## Real-Time Chat Integration

The interview chat uses Supabase Realtime for instant messaging. When a message is sent:

1. Message is saved to the `messages` table
2. Supabase Realtime broadcasts to both participants
3. Message count is incremented in interview session
4. If it's the first message, chat phase is auto-started

## Voice Call Integration

Voice calls are implemented using the existing message infrastructure. The process:

1. Business clicks "Start Voice Call"
2. Worker receives notification
3. Voice call tracking starts (`voice_started_at`)
4. Call duration is tracked
5. On call end, duration is saved (`voice_completed_at`, `voice_duration`)

## Migration

Run the migration to add interview_sessions table:

```bash
psql -U your_user -d your_database -f migrations/add_interview_sessions.sql
```

## Future Enhancements

Potential improvements:

1. **AI-powered interview questions** - Auto-generate questions based on job requirements
2. **Video interviews** - Add video call option for certain job types
3. **Skill assessment** - Interactive skill tests during interview
4. **Automated scheduling** - Schedule interviews based on worker availability
5. **Interview scoring** - Rate interview quality for future matching
6. **Multi-worker interviews** - Group interviews for hiring multiple workers
