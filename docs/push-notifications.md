# Push Notifications with Firebase Cloud Messaging (FCM)

This document provides setup instructions and implementation details for push notifications in Daily Worker Hub using Firebase Cloud Messaging (FCM).

## Table of Contents

1. [Overview](#overview)
2. [Firebase Console Setup](#firebase-console-setup)
3. [Environment Variables](#environment-variables)
4. [Database Migration](#database-migration)
5. [API Endpoints](#api-endpoints)
6. [React Hook Usage](#react-hook-usage)
7. [Server-Side Usage](#server-side-usage)
8. [Notification Types](#notification-types)
9. [Troubleshooting](#troubleshooting)

## Overview

The push notification system uses Firebase Cloud Messaging (FCM) to send real-time notifications to users across web browsers, Android, and iOS devices.

### Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Client App    │────▶│   FCM Service    │◀────│   Server API    │
│  (React/React   │     │  (Firebase)      │     │  (Next.js API)  │
│   Native)       │     │                  │     │                 │
└─────────────────┘     └──────────────────┘     └─────────────────┘
        │                                                │
        │                                                │
        ▼                                                ▼
┌─────────────────┐                           ┌─────────────────┐
│  FCM Token      │                           │  Notification   │
│  Registration   │                           │  Service        │
└─────────────────┘                           └─────────────────┘
```

### Key Components

- **lib/firebase-admin.ts** - Firebase Admin SDK for server-side messaging
- **lib/firebase-client.ts** - Firebase Client SDK for browser notifications
- **lib/notifications/service.ts** - Notification service with helper functions
- **hooks/use-fcm-notifications.ts** - React hook for client-side FCM management

## Firebase Console Setup

### Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add project" or select an existing project
3. Enter project name: `daily-worker-hub` (or your preferred name)
4. Enable Google Analytics (optional)
5. Click "Create project"

### Step 2: Add Web App

1. In your project, click the web icon (`</>`) to add a web app
2. Enter app nickname: `Daily Worker Hub Web`
3. Check "Also set up Firebase Hosting" (optional)
4. Click "Register app"
5. Copy the Firebase configuration (you'll need this for environment variables)

### Step 3: Generate Private Key (Admin SDK)

1. Go to Project Settings > Service accounts
2. Click "Generate new private key"
3. Save the JSON file securely (do NOT commit to version control)
4. Extract the following values:
   - `project_id`
   - `client_email`
   - `private_key`

### Step 4: Generate VAPID Key (Web Push)

1. Go to Project Settings > Cloud Messaging
2. Under "Web configuration", click "Generate key pair"
3. Copy the generated VAPID key

### Step 5: Enable Cloud Messaging API

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your Firebase project
3. Search for "Cloud Messaging API"
4. Enable the API if not already enabled

## Environment Variables

Add the following environment variables to your `.env.local` file:

```bash
# ===========================================
# Firebase Configuration (Client - Browser)
# ===========================================
# Get these from Firebase Console > Project Settings > General > Your apps

NEXT_PUBLIC_FIREBASE_API_KEY=your-api-key
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your-project-id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your-project.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
NEXT_PUBLIC_FIREBASE_APP_ID=your-app-id

# VAPID key for web push (from Cloud Messaging settings)
NEXT_PUBLIC_FIREBASE_VAPID_KEY=your-vapid-key

# ===========================================
# Firebase Configuration (Admin - Server)
# ===========================================
# Get these from the private key JSON file

FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@your-project.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

### Vercel Deployment

For Vercel deployment, add these as environment variables in your Vercel project settings:

1. Go to your Vercel project > Settings > Environment Variables
2. Add each variable with the appropriate values
3. For `FIREBASE_PRIVATE_KEY`, ensure you use the exact format with `\n` for newlines

## Database Migration

Run the migration to create the required tables:

```bash
# Using Supabase CLI
supabase db push

# Or manually run the SQL file
psql -f supabase/migrations/20260318000000_fcm_tokens.sql
```

### Tables Created

1. **user_fcm_tokens** - Stores FCM device tokens
   - `user_id` - User reference
   - `token` - FCM device token
   - `device_type` - 'web', 'android', or 'ios'
   - `is_active` - Token validity flag

2. **notification_preferences** - User notification settings
   - `push_enabled` - Master switch
   - `*_notifications` - Per-type preferences
   - `quiet_hours_*` - Quiet hours settings

## API Endpoints

### POST /api/notifications/register-token

Register an FCM device token for the authenticated user.

```typescript
// Request
{
  "token": "fcm-device-token",
  "deviceType": "web", // | "android" | "ios"
  "deviceId": "unique-device-id", // optional
  "deviceName": "Chrome on macOS" // optional
}

// Response
{
  "success": true,
  "message": "Token FCM berhasil didaftarkan",
  "data": { ... }
}
```

### DELETE /api/notifications/token

Remove an FCM token (called on logout).

```typescript
// Query params
// ?token=fcm-token or ?deviceId=device-id

// Response
{
  "success": true,
  "message": "Token FCM berhasil dihapus"
}
```

### GET /api/notifications/preferences

Get notification preferences for the authenticated user.

```typescript
// Response
{
  "success": true,
  "data": {
    "push_enabled": true,
    "booking_notifications": true,
    "payment_notifications": true,
    // ... other preferences
  }
}
```

### PUT /api/notifications/preferences

Update notification preferences.

```typescript
// Request
{
  "push_enabled": true,
  "booking_notifications": true,
  "quiet_hours_enabled": true,
  "quiet_hours_start": "22:00",
  "quiet_hours_end": "07:00"
}

// Response
{
  "success": true,
  "message": "Preferensi notifikasi berhasil diperbarui"
}
```

### POST /api/notifications/send

Send a push notification (admin/business/worker).

```typescript
// Request (single user)
{
  "userId": "user-id",
  "type": "booking_confirmed",
  "notification": {
    "title": "Booking Dikonfirmasi!",
    "body": "Booking Anda telah dikonfirmasi",
    "icon": "/icon.png",
    "clickAction": "/bookings/123"
  }
}

// Request (multiple users)
{
  "userIds": ["user-1", "user-2"],
  "type": "job_reminder",
  "notification": { ... }
}

// Request (topic)
{
  "topic": "all-workers",
  "type": "marketing",
  "notification": { ... }
}
```

## React Hook Usage

### Basic Usage

```tsx
import { useFcmNotifications } from "@/hooks/use-fcm-notifications";

function NotificationSettings() {
  const {
    permission,
    isRegistered,
    isLoading,
    error,
    register,
    unregister,
    requestPermission,
  } = useFcmNotifications({
    userId: currentUser.id,
    autoRegister: false,
    onMessageReceived: (payload) => {
      console.log("Notification received:", payload);
    },
  });

  return (
    <div>
      <p>Permission: {permission}</p>
      <p>Registered: {isRegistered ? "Yes" : "No"}</p>

      {error && <p className="error">{error}</p>}

      {permission === "default" && (
        <button onClick={requestPermission}>Enable Notifications</button>
      )}

      {permission === "granted" && !isRegistered && (
        <button onClick={register} disabled={isLoading}>
          {isLoading ? "Registering..." : "Register Device"}
        </button>
      )}

      {isRegistered && (
        <button onClick={unregister} disabled={isLoading}>
          Unregister
        </button>
      )}
    </div>
  );
}
```

### With Auto-Registration

```tsx
// Automatically register when permission is granted
const { isRegistered } = useFcmNotifications({
  userId: currentUser.id,
  autoRegister: true,
  enabled: true,
});
```

### Handling Foreground Messages

```tsx
const { register } = useFcmNotifications({
  userId: currentUser.id,
  onMessageReceived: (payload) => {
    // Show toast notification
    toast.success(payload.notification?.title || "New notification");

    // Or use a custom notification component
    showNotification({
      title: payload.notification?.title,
      body: payload.notification?.body,
      icon: payload.notification?.image,
      onClick: () => {
        // Handle click
        if (payload.data?.bookingId) {
          router.push(`/bookings/${payload.data.bookingId}`);
        }
      },
    });
  },
});
```

## Server-Side Usage

### Using the Notification Service

```typescript
import { notificationService } from "@/lib/notifications/service";

// Send to a single user
await notificationService.sendToUser(
  "user-id",
  {
    title: "Booking Confirmed",
    body: "Your booking has been confirmed",
    data: { bookingId: "123" },
    clickAction: "/bookings/123",
  },
  "booking_confirmed",
);

// Send to multiple users
await notificationService.sendToUsers(
  ["user-1", "user-2", "user-3"],
  {
    title: "New Job Available",
    body: "A new job matching your skills is available",
    clickAction: "/jobs",
  },
  "booking_created",
);

// Send to a topic (for broadcasts)
await notificationService.sendToTopic(
  "all-workers",
  {
    title: "Maintenance Notice",
    body: "The app will be under maintenance tonight",
  },
  "booking_created",
);
```

### Using Convenience Functions

```typescript
import {
  sendBookingConfirmed,
  sendPaymentReceived,
  sendJobReminder,
} from "@/lib/notifications/service";

// Booking confirmed
await sendBookingConfirmed(workerUserId, businessName, jobTitle, bookingId);

// Payment received
await sendPaymentReceived(workerUserId, amount, businessName, paymentId);

// Job reminder
await sendJobReminder(
  workerUserId,
  jobTitle,
  businessName,
  startTime,
  bookingId,
);
```

### Topic Subscriptions

```typescript
// Subscribe a user to a topic
await notificationService.subscribeToTopic("user-id", "all-workers");

// Unsubscribe from a topic
await notificationService.unsubscribeFromTopic("user-id", "all-workers");
```

## Notification Types

| Type                   | Description            | Priority |
| ---------------------- | ---------------------- | -------- |
| `booking_created`      | New booking created    | Normal   |
| `booking_confirmed`    | Booking confirmed      | Normal   |
| `booking_cancelled`    | Booking cancelled      | High     |
| `job_reminder`         | Job shift reminder     | High     |
| `payment_received`     | Payment received       | Normal   |
| `payment_failed`       | Payment failed         | High     |
| `new_message`          | New chat message       | Normal   |
| `review_request`       | Request for review     | Low      |
| `worker_application`   | New worker application | Normal   |
| `application_accepted` | Application accepted   | Normal   |
| `application_rejected` | Application rejected   | Normal   |

## Troubleshooting

### Common Issues

#### 1. "Firebase Admin not configured" error

**Cause:** Missing environment variables

**Solution:** Ensure all `FIREBASE_*` environment variables are set correctly.

```bash
# Check if variables are set
echo $FIREBASE_PROJECT_ID
echo $FIREBASE_CLIENT_EMAIL
```

#### 2. "Permission denied" or "Unauthorized" error

**Cause:** Invalid or expired authentication token

**Solution:** Ensure user is authenticated before calling API endpoints.

#### 3. "Invalid registration token" error

**Cause:** FCM token is invalid or expired

**Solution:** The system automatically marks invalid tokens as inactive. Re-register the token on the client.

#### 4. Notifications not received in browser

**Possible causes:**

- Browser doesn't support FCM
- Notification permission denied
- Service worker not registered
- App not in foreground (background notifications need service worker)

**Solutions:**

- Check browser compatibility
- Reset notification permission in browser settings
- Ensure service worker is registered (`/sw.js`)
- Check Firebase console for delivery status

#### 5. Private key format issues

**Cause:** Incorrect private key format

**Solution:** Ensure the private key includes `\n` for newlines:

```bash
# Correct format
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBg...\n-----END PRIVATE KEY-----\n"
```

### Debug Mode

Enable debug logging in development:

```typescript
// In your component
useFcmNotifications({
  userId: currentUser.id,
  onMessageReceived: (payload) => {
    console.log("[FCM Debug] Message received:", payload);
  },
});
```

### Testing Notifications

Use the API endpoint to test:

```bash
curl -X POST http://localhost:3000/api/notifications/send \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "userId": "your-user-id",
    "type": "booking_confirmed",
    "notification": {
      "title": "Test Notification",
      "body": "This is a test notification"
    }
  }'
```

## Security Considerations

1. **Private Key Protection:** Never commit the Firebase private key to version control
2. **Token Validation:** Tokens are validated before storage
3. **Rate Limiting:** Consider implementing rate limiting for notification endpoints
4. **User Preferences:** Always respect user notification preferences
5. **Quiet Hours:** Notifications are suppressed during quiet hours

## Best Practices

1. **Token Management:**
   - Register tokens on app load if permission is granted
   - Unregister tokens on logout
   - Handle token refresh events

2. **User Experience:**
   - Ask for permission at appropriate times (not on first load)
   - Explain why you need notification permission
   - Provide easy access to notification preferences

3. **Notification Content:**
   - Keep titles short (under 65 characters)
   - Keep body text concise (under 240 characters)
   - Include actionable data in the `data` field
   - Use appropriate notification types

4. **Performance:**
   - Use topics for broadcast messages
   - Batch notifications when possible
   - Clean up old inactive tokens periodically

## Additional Resources

- [Firebase Cloud Messaging Documentation](https://firebase.google.com/docs/cloud-messaging)
- [Firebase Admin SDK for Node.js](https://firebase.google.com/docs/admin/setup)
- [Web Push Notifications Best Practices](https://web.dev/push-notifications-best-practices/)
