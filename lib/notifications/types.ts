/**
 * Notification types and interfaces for FCM push notifications
 */

// Notification types supported by the system
export type NotificationType =
  | 'booking_created'
  | 'booking_confirmed'
  | 'booking_cancelled'
  | 'booking_reminder'
  | 'job_reminder'
  | 'payment_received'
  | 'payment_failed'
  | 'new_message'
  | 'review_request'
  | 'worker_application'
  | 'application_accepted'
  | 'application_rejected'
  | 'shift_reminder'
  | 'check_in_reminder'
  | 'check_out_reminder'

// Priority levels for notifications
export type NotificationPriority = 'high' | 'normal' | 'low'

// Base notification payload
export interface NotificationPayload {
  title: string
  body: string
  icon?: string
  image?: string
  badge?: string
  tag?: string
  data?: Record<string, string>
  clickAction?: string
  priority?: NotificationPriority
  ttl?: number // Time to live in seconds
}

// FCM token data
export interface FcmTokenData {
  userId: string
  token: string
  deviceType: 'web' | 'android' | 'ios'
  deviceId?: string
  deviceName?: string
  isActive: boolean
  lastUsedAt?: string
}

// Notification preferences
export interface NotificationPreferences {
  userId: string
  pushEnabled: boolean
  bookingNotifications: boolean
  paymentNotifications: boolean
  messageNotifications: boolean
  reminderNotifications: boolean
  reviewNotifications: boolean
  marketingNotifications: boolean
  quietHoursEnabled: boolean
  quietHoursStart?: string // HH:mm format
  quietHoursEnd?: string // HH:mm format
}

// Result of sending a notification
export interface SendNotificationResult {
  success: boolean
  messageId?: string
  error?: string
  invalidTokens?: string[]
}

// Result of sending to multiple users
export interface SendToManyResult {
  success: boolean
  successCount: number
  failureCount: number
  invalidTokens: string[]
  errors: string[]
}

// Topic subscription result
export interface TopicSubscriptionResult {
  success: boolean
  error?: string
}

// FCM message payload (for Admin SDK)
export interface FcmMessagePayload {
  token?: string
  tokens?: string[]
  topic?: string
  notification: {
    title: string
    body: string
    image?: string
  }
  data?: Record<string, string>
  android?: {
    priority: 'high' | 'normal'
    ttl?: number
    notification?: {
      icon?: string
      color?: string
      sound?: string
      channel_id?: string
      click_action?: string
    }
  }
  apns?: {
    payload: {
      aps: {
        alert: {
          title: string
          body: string
        }
        badge?: number
        sound?: string
        category?: string
      }
    }
  }
  webpush?: {
    notification: {
      icon?: string
      badge?: string
      tag?: string
      requireInteraction?: boolean
      actions?: Array<{
        action: string
        title: string
        icon?: string
      }>
    }
    fcm_options?: {
      link?: string
    }
  }
}

// Notification template
export interface NotificationTemplate {
  type: NotificationType
  titleTemplate: string
  bodyTemplate: string
  icon?: string
  priority: NotificationPriority
  dataKeys: string[] // Required data keys for the template
}

// Notification event for tracking
export interface NotificationEvent {
  id: string
  userId: string
  type: NotificationType
  title: string
  body: string
  data?: Record<string, string>
  sentAt: string
  deliveredAt?: string
  readAt?: string
  clickedAt?: string
  deviceId?: string
}
