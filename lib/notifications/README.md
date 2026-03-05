# Notification System Implementation

## Overview
A comprehensive notification system for Daily Worker Hub supporting in-app notifications, email notifications, and push notifications.

## Features Implemented

### 1. Email Client (`lib/notifications/email.ts`)
- Resend email client setup
- `sendEmail()` - Send React-based email templates
- `sendTextEmail()` - Send plain text emails
- `isEmailConfigured()` - Check if email service is available
- Graceful error handling when RESEND_API_KEY is not configured

### 2. Email Templates (Indonesian Language)

All templates are fully responsive with professional styling.

#### Application Received (`lib/notifications/templates/application-received.tsx`)
Notifies business when a worker applies for a job.
- Business name and logo
- Worker details (name, skills, experience)
- Job information
- Direct link to view application
- Tips for reviewing applications

#### Application Status Update (`lib/notifications/templates/application-status-update.tsx`)
Notifies worker when their application status changes.
- Status indicators (accepted/rejected/pending/reviewing)
- Business-provided message
- Next steps for accepted applications
- Encouragement for rejected applications

#### Booking Confirmed (`lib/notifications/templates/booking-confirmed.tsx`)
Notifies both parties when a booking is confirmed.
- Job details and duration
- Location information
- Daily wage breakdown
- Special instructions
- Tips for the work day
- Works for both workers and businesses

#### Payment Receipt (`lib/notifications/templates/payment-receipt.tsx`)
Sends payment confirmation with detailed receipt.
- Professional receipt design
- Payment ID and date
- Work period breakdown
- Deductions and bonuses
- Final amount received
- Payment method information

#### Job Reminder (`lib/notifications/templates/job-reminder.tsx`)
Reminds worker about upcoming job (sent 2 hours before).
- Urgent reminder banner
- Job details with time and location
- Google Maps link
- Contact information
- Dress code requirements
- Checklist of items to bring
- Preparation tips

### 3. Notification Triggers (`lib/actions/notifications.ts`)

Added email notification triggers:

- `notifyApplicationReceived()` - Triggered when worker applies
- `notifyApplicationStatusUpdate()` - Triggered when status changes
- `notifyBookingConfirmed()` - Triggered when booking confirmed
- `notifyPaymentCompleted()` - Triggered when payment completes
- `notifyJobReminder()` - Triggered for job reminders

All triggers create both:
- In-app notification in database
- Email notification via Resend

### 4. Push Notification Hooks (`lib/actions/push-notifications.ts`)

Added push notification trigger hooks that respect user preferences:

- `triggerApplicationReceivedPush()` - New applications
- `triggerApplicationStatusPush()` - Application status changes
- `triggerBookingConfirmedPush()` - Booking confirmations
- `triggerPaymentCompletedPush()` - Payment confirmations
- `triggerJobReminderPush()` - Job reminders
- `triggerNewJobMatchPush()` - New job matches

### 5. Notification Bell Component (`components/notifications/notification-bell.tsx`)

React component with:
- Bell icon with unread count badge
- Dropdown showing recent notifications
- Mark individual notifications as read
- Mark all as read button
- Relative time formatting (e.g., "5 menit lalu")
- Click outside to close
- Direct link to notification target
- Empty state with helpful message

### 6. Notification List Component (`components/notifications/notification-list.tsx`)

Full-featured notification management:
- Filter by: All / Unread / Read
- Unread count badge
- Mark individual as read
- Mark all as read button
- Delete notifications
- Relative and absolute time display
- Direct links to notification targets
- Loading states
- Empty states per filter
- Responsive design

### 7. API Routes

#### GET /api/notifications
- List all notifications for authenticated user
- Query params: `filter` (all/unread/read), `limit`, `offset`
- Returns unread count
- Pagination support

#### PATCH /api/notifications
- Mark all notifications as read
- Returns count of updated notifications

#### PATCH /api/notifications/[id]/read
- Mark specific notification as read
- Verifies notification belongs to user

#### GET /api/notifications/settings
- Get user's notification preferences
- Creates default preferences if not exist

#### POST /api/notifications/settings
- Update notification preferences
- Supported fields:
  - `push_enabled` - Master switch
  - `new_applications` - Job application notifications
  - `booking_status` - Booking updates
  - `payment_confirmation` - Payment notifications
  - `new_job_matches` - New job matches
  - `shift_reminders` - Job reminders

## Usage Examples

### Sending Email Notifications

```typescript
import { notifyApplicationReceived } from '@/lib/actions/notifications'

// When a worker applies
await notifyApplicationReceived({
  businessUserId: 'user-123',
  businessName: 'Hotel Bali',
  businessEmail: 'contact@hotelbali.com',
  workerName: 'Made Wayan',
  workerEmail: 'made@example.com',
  jobTitle: 'Housekeeping Staff',
  applicationId: 'app-456',
  workerSkills: ['Cleaning', 'Hospitality'],
  workerExperience: '3 years experience',
})
```

### Sending Push Notifications

```typescript
import { triggerApplicationReceivedPush } from '@/lib/actions/push-notifications'

// Respects user preferences automatically
await triggerApplicationReceivedPush({
  businessUserId: 'user-123',
  workerName: 'Made Wayan',
  jobTitle: 'Housekeeping Staff',
  applicationId: 'app-456',
})
```

### Using Notification Bell Component

```typescript
import { NotificationBell } from '@/components/notifications'

<NotificationBell
  initialCount={5}
  onFetchNotifications={async () => {
    const res = await fetch('/api/notifications')
    const { data } = await res.json()
    return data
  }}
  onMarkAsRead={async (id) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
  }}
  onMarkAllAsRead={async () => {
    await fetch('/api/notifications', { method: 'PATCH' })
  }}
/>
```

### Using Notification List Component

```typescript
import { NotificationList } from '@/components/notifications'

<NotificationList
  onFetchNotifications={async (filter) => {
    const res = await fetch(`/api/notifications?filter=${filter}`)
    const { data } = await res.json()
    return data
  }}
  onMarkAsRead={async (id) => {
    await fetch(`/api/notifications/${id}/read`, { method: 'PATCH' })
  }}
  onMarkAllAsRead={async () => {
    await fetch('/api/notifications', { method: 'PATCH' })
  }}
  onDeleteNotification={async (id) => {
    await fetch(`/api/notifications/${id}`, { method: 'DELETE' })
  }}
/>
```

## Environment Variables

Add to `.env.local`:

```bash
# Resend API Key for email notifications
# Get from: https://resend.com/api-keys
RESEND_API_KEY=re_xxxxxxxxxxxxxx
```

## Dependencies

Added to `package.json`:
- `resend` ^4.0.1 - Email service integration

## Files Created/Modified

### Created:
- `lib/notifications/email.ts`
- `lib/notifications/templates/application-received.tsx`
- `lib/notifications/templates/application-status-update.tsx`
- `lib/notifications/templates/booking-confirmed.tsx`
- `lib/notifications/templates/payment-receipt.tsx`
- `lib/notifications/templates/job-reminder.tsx`
- `lib/notifications/templates/index.ts`
- `lib/notifications/index.ts`
- `components/notifications/notification-bell.tsx`
- `components/notifications/notification-list.tsx`
- `components/notifications/index.ts`
- `app/api/notifications/route.ts`
- `app/api/notifications/[id]/read/route.ts`
- `app/api/notifications/settings/route.ts`

### Modified:
- `lib/actions/notifications.ts` - Added email triggers
- `lib/actions/push-notifications.ts` - Added push hooks
- `package.json` - Added resend dependency
- `.env.example` - Added RESEND_API_KEY

## Next Steps

1. **Install dependencies**: `npm install`
2. **Set up Resend account** and get API key
3. **Add RESEND_API_KEY to .env.local**
4. **Integrate notification triggers** into:
   - Job application creation flow
   - Application status update flow
   - Booking confirmation flow
   - Payment completion flow
   - Cron job for job reminders
5. **Add NotificationBell to navigation** for easy access
6. **Create /notifications page** for full notification list

## Notes

- All email templates are in Indonesian language
- Push notifications respect user preferences
- Email sending gracefully handles missing RESEND_API_KEY
- Components are fully responsive and accessible
- API routes include proper authentication checks
- Error handling follows Indonesian language conventions
