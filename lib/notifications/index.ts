// Notifications Module

// Email Notifications
export { sendEmail, sendTextEmail, isEmailConfigured } from './email'
export type { EmailResult, EmailOptions } from './email'

// Email Templates
export * from './templates'

// FCM Push Notifications
export { 
  NotificationService,
  notificationService,
  sendToUser,
  sendToUsers,
  sendToTopic,
} from './service'

// FCM Types
export type {
  NotificationType,
  NotificationPriority,
  NotificationPayload,
  FcmTokenData,
  NotificationPreferences,
  SendNotificationResult,
  SendToManyResult,
  TopicSubscriptionResult,
  FcmMessagePayload,
  NotificationTemplate,
  NotificationEvent,
} from './types'
