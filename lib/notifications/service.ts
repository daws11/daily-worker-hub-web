import "server-only";
import {
  getFirebaseMessaging,
  isFirebaseAdminConfigured,
} from "../firebase-admin";
import { createClient } from "../supabase/server";
import { logger } from "../logger";
import type {
  NotificationPayload,
  NotificationType,
  SendNotificationResult,
  SendToManyResult,
  TopicSubscriptionResult,
  FcmMessagePayload,
} from "./types";

const routeLogger = logger.createApiLogger("notification-service");

/**
 * Notification Service
 * Handles sending push notifications via Firebase Cloud Messaging
 */
export class NotificationService {
  /**
   * Send a push notification to a specific user
   */
  async sendToUser(
    userId: string,
    payload: NotificationPayload,
    notificationType: NotificationType,
  ): Promise<SendNotificationResult> {
    try {
      if (!isFirebaseAdminConfigured()) {
        routeLogger.warn(
          "Firebase Admin not configured, skipping notification",
        );
        return { success: false, error: "Firebase Admin not configured" };
      }

      const supabase = await createClient();

      // Check user's notification preferences
      const { data: preferences } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (preferences && !preferences.push_enabled) {
        routeLogger.info("Push notifications disabled for user", { userId });
        return { success: true }; // Silently succeed
      }

      // Check if this notification type is enabled
      if (!this.isNotificationTypeEnabled(preferences, notificationType)) {
        routeLogger.info("Notification type disabled for user", {
          userId,
          type: notificationType,
        });
        return { success: true };
      }

      // Check quiet hours
      if (preferences && this.isQuietHours(preferences)) {
        routeLogger.info("Quiet hours active, skipping notification", {
          userId,
        });
        return { success: true };
      }

      // Get user's active FCM tokens
      const { data: tokens, error: tokenError } = await supabase
        .from("user_fcm_tokens")
        .select("token")
        .eq("user_id", userId)
        .eq("is_active", true);

      if (tokenError) {
        routeLogger.error("Failed to fetch FCM tokens", tokenError, { userId });
        return { success: false, error: "Failed to fetch FCM tokens" };
      }

      if (!tokens || tokens.length === 0) {
        routeLogger.info("No active FCM tokens for user", { userId });
        return { success: false, error: "No active FCM tokens" };
      }

      const messaging = getFirebaseMessaging();
      const invalidTokens: string[] = [];

      // Send to all user's devices
      const results = await Promise.all(
        tokens.map(async ({ token }) => {
          try {
            const fcmMessage = this.buildFcmMessage(token, payload) as any;
            const response = await messaging.send(fcmMessage);
            return { success: true, messageId: response, token };
          } catch (error: any) {
            if (
              error.code === "messaging/invalid-registration-token" ||
              error.code === "messaging/registration-token-not-registered"
            ) {
              invalidTokens.push(token);
            }
            return { success: false, error: error.message, token };
          }
        }),
      );

      // Mark invalid tokens as inactive
      if (invalidTokens.length > 0) {
        await this.markTokensInvalid(invalidTokens);
      }

      // Update last_used_at for successful tokens
      const successfulTokens = results
        .filter((r) => r.success)
        .map((r) => r.token);

      if (successfulTokens.length > 0) {
        await supabase
          .from("user_fcm_tokens")
          .update({ last_used_at: new Date().toISOString() })
          .in("token", successfulTokens);
      }

      // Store notification in database
      await this.storeNotification(userId, notificationType, payload);

      const successCount = results.filter((r) => r.success).length;
      routeLogger.info("Notification sent", {
        userId,
        type: notificationType,
        successCount,
        failureCount: results.length - successCount,
      });

      return {
        success: successCount > 0,
        messageId: results.find((r) => r.success)?.messageId,
        invalidTokens: invalidTokens.length > 0 ? invalidTokens : undefined,
      };
    } catch (error: any) {
      routeLogger.error("Failed to send notification", error, {
        userId,
        type: notificationType,
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Send a push notification to multiple users
   */
  async sendToUsers(
    userIds: string[],
    payload: NotificationPayload,
    notificationType: NotificationType,
  ): Promise<SendToManyResult> {
    try {
      if (!isFirebaseAdminConfigured()) {
        return {
          success: false,
          successCount: 0,
          failureCount: userIds.length,
          invalidTokens: [],
          errors: ["Firebase Admin not configured"],
        };
      }

      const supabase = await createClient();

      // Get all active tokens for the users
      const { data: tokens, error } = await supabase
        .from("user_fcm_tokens")
        .select("user_id, token")
        .in("user_id", userIds)
        .eq("is_active", true);

      if (error || !tokens || tokens.length === 0) {
        return {
          success: false,
          successCount: 0,
          failureCount: userIds.length,
          invalidTokens: [],
          errors: [error?.message || "No active tokens found"],
        };
      }

      // Get notification preferences for all users
      const { data: preferencesData } = await supabase
        .from("notification_preferences")
        .select("*")
        .in("user_id", userIds);

      const preferencesMap = new Map(
        (preferencesData || []).map((p) => [p.user_id, p]),
      );

      // Filter users who have this notification type enabled
      const eligibleTokens = tokens.filter((t) => {
        const prefs = preferencesMap.get(t.user_id);
        if (!prefs) return true; // Default to sending if no preferences
        if (!prefs.push_enabled) return false;
        if (this.isQuietHours(prefs)) return false;
        return this.isNotificationTypeEnabled(prefs, notificationType);
      });

      if (eligibleTokens.length === 0) {
        return {
          success: true,
          successCount: 0,
          failureCount: 0,
          invalidTokens: [],
          errors: [],
        };
      }

      const messaging = getFirebaseMessaging();
      const tokenList = eligibleTokens.map((t) => t.token);

      // Use multicast for sending to multiple tokens
      const fcmMessage = this.buildMulticastMessage(tokenList, payload);
      const response = await messaging.sendEachForMulticast(fcmMessage);

      // Collect invalid tokens
      const invalidTokens: string[] = [];
      response.responses.forEach((resp, idx) => {
        if (!resp.success) {
          const error = resp.error as any;
          if (
            error.code === "messaging/invalid-registration-token" ||
            error.code === "messaging/registration-token-not-registered"
          ) {
            invalidTokens.push(tokenList[idx]);
          }
        }
      });

      // Mark invalid tokens
      if (invalidTokens.length > 0) {
        await this.markTokensInvalid(invalidTokens);
      }

      const errors = response.responses
        .filter((r) => !r.success)
        .map((r) => (r.error as any)?.message || "Unknown error");

      // Store notifications
      const uniqueUserIds = [...new Set(eligibleTokens.map((t) => t.user_id))];
      await Promise.all(
        uniqueUserIds.map((userId) =>
          this.storeNotification(userId, notificationType, payload),
        ),
      );

      return {
        success: response.successCount > 0,
        successCount: response.successCount,
        failureCount: response.failureCount,
        invalidTokens,
        errors,
      };
    } catch (error: any) {
      routeLogger.error("Failed to send notifications to users", error, {
        count: userIds.length,
      });
      return {
        success: false,
        successCount: 0,
        failureCount: userIds.length,
        invalidTokens: [],
        errors: [error.message],
      };
    }
  }

  /**
   * Send a push notification to a topic (for broadcast messages)
   */
  async sendToTopic(
    topic: string,
    payload: NotificationPayload,
    notificationType: NotificationType,
  ): Promise<SendNotificationResult> {
    try {
      if (!isFirebaseAdminConfigured()) {
        return { success: false, error: "Firebase Admin not configured" };
      }

      const messaging = getFirebaseMessaging();
      const fcmMessage = this.buildTopicMessage(topic, payload);
      const messageId = await messaging.send(fcmMessage);

      routeLogger.info("Topic notification sent", {
        topic,
        type: notificationType,
        messageId,
      });

      return { success: true, messageId };
    } catch (error: any) {
      routeLogger.error("Failed to send topic notification", error, { topic });
      return { success: false, error: error.message };
    }
  }

  /**
   * Subscribe a user's tokens to a topic
   */
  async subscribeToTopic(
    userId: string,
    topic: string,
  ): Promise<TopicSubscriptionResult> {
    try {
      const supabase = await createClient();

      const { data: tokens } = await supabase
        .from("user_fcm_tokens")
        .select("token")
        .eq("user_id", userId)
        .eq("is_active", true);

      if (!tokens || tokens.length === 0) {
        return { success: false, error: "No active tokens found" };
      }

      const messaging = getFirebaseMessaging();
      await messaging.subscribeToTopic(
        tokens.map((t) => t.token),
        topic,
      );

      routeLogger.info("User subscribed to topic", { userId, topic });
      return { success: true };
    } catch (error: any) {
      routeLogger.error("Failed to subscribe to topic", error, {
        userId,
        topic,
      });
      return { success: false, error: error.message };
    }
  }

  /**
   * Unsubscribe a user's tokens from a topic
   */
  async unsubscribeFromTopic(
    userId: string,
    topic: string,
  ): Promise<TopicSubscriptionResult> {
    try {
      const supabase = await createClient();

      const { data: tokens } = await supabase
        .from("user_fcm_tokens")
        .select("token")
        .eq("user_id", userId)
        .eq("is_active", true);

      if (!tokens || tokens.length === 0) {
        return { success: true }; // Nothing to unsubscribe
      }

      const messaging = getFirebaseMessaging();
      await messaging.unsubscribeFromTopic(
        tokens.map((t) => t.token),
        topic,
      );

      routeLogger.info("User unsubscribed from topic", { userId, topic });
      return { success: true };
    } catch (error: any) {
      routeLogger.error("Failed to unsubscribe from topic", error, {
        userId,
        topic,
      });
      return { success: false, error: error.message };
    }
  }

  // ==========================================
  // Notification Type Helpers
  // ==========================================

  /**
   * Send booking created notification
   */
  async sendBookingCreated(
    businessUserId: string,
    workerName: string,
    jobTitle: string,
    bookingId: string,
  ): Promise<SendNotificationResult> {
    return this.sendToUser(
      businessUserId,
      {
        title: "Booking Baru",
        body: `${workerName} telah booking untuk ${jobTitle}`,
        data: { bookingId, type: "booking_created" },
        clickAction: `/bookings/${bookingId}`,
      },
      "booking_created",
    );
  }

  /**
   * Send booking confirmed notification
   */
  async sendBookingConfirmed(
    workerUserId: string,
    businessName: string,
    jobTitle: string,
    bookingId: string,
  ): Promise<SendNotificationResult> {
    return this.sendToUser(
      workerUserId,
      {
        title: "Booking Dikonfirmasi!",
        body: `Booking Anda di ${businessName} untuk ${jobTitle} telah dikonfirmasi`,
        data: { bookingId, type: "booking_confirmed" },
        clickAction: `/bookings/${bookingId}`,
      },
      "booking_confirmed",
    );
  }

  /**
   * Send job reminder notification
   */
  async sendJobReminder(
    workerUserId: string,
    jobTitle: string,
    businessName: string,
    startTime: string,
    bookingId: string,
  ): Promise<SendNotificationResult> {
    return this.sendToUser(
      workerUserId,
      {
        title: "⏰ Pengingat Pekerjaan",
        body: `${jobTitle} di ${businessName} dimulai ${startTime}`,
        data: { bookingId, type: "job_reminder" },
        clickAction: `/bookings/${bookingId}`,
        priority: "high",
      },
      "job_reminder",
    );
  }

  /**
   * Send payment received notification
   */
  async sendPaymentReceived(
    workerUserId: string,
    amount: number,
    businessName: string,
    paymentId: string,
  ): Promise<SendNotificationResult> {
    const formattedAmount = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(amount);

    return this.sendToUser(
      workerUserId,
      {
        title: "💰 Pembayaran Diterima!",
        body: `${formattedAmount} dari ${businessName}`,
        data: { paymentId, type: "payment_received" },
        clickAction: `/wallet`,
      },
      "payment_received",
    );
  }

  /**
   * Send new message notification
   */
  async sendNewMessage(
    recipientUserId: string,
    senderName: string,
    messagePreview: string,
    conversationId: string,
  ): Promise<SendNotificationResult> {
    return this.sendToUser(
      recipientUserId,
      {
        title: senderName,
        body:
          messagePreview.length > 100
            ? `${messagePreview.slice(0, 100)}...`
            : messagePreview,
        data: { conversationId, type: "new_message" },
        clickAction: `/messages/${conversationId}`,
        tag: `message-${conversationId}`, // Group messages
      },
      "new_message",
    );
  }

  /**
   * Send review request notification
   */
  async sendReviewRequest(
    userId: string,
    otherPartyName: string,
    bookingId: string,
  ): Promise<SendNotificationResult> {
    return this.sendToUser(
      userId,
      {
        title: "⭐ Berikan Review",
        body: `Bagaimana pengalaman Anda dengan ${otherPartyName}?`,
        data: { bookingId, type: "review_request" },
        clickAction: `/bookings/${bookingId}/review`,
      },
      "review_request",
    );
  }

  // ==========================================
  // Private Helper Methods
  // ==========================================

  private buildFcmMessage(
    token: string,
    payload: NotificationPayload,
  ): FcmMessagePayload {
    return {
      token,
      notification: {
        title: payload.title,
        body: payload.body,
        image: payload.image,
      },
      data: payload.data || {},
      android: {
        priority: payload.priority === "high" ? "high" : "normal",
        ttl: payload.ttl || 86400, // 24 hours default
        notification: {
          icon: "ic_notification",
          color: "#4F46E5",
          sound: "default",
          channel_id: "default",
          click_action: payload.clickAction,
        },
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: payload.title,
              body: payload.body,
            },
            badge: 1,
            sound: "default",
          },
        },
      },
      webpush: {
        notification: {
          icon: payload.icon || "/icon-192x192.png",
          badge: payload.badge || "/badge-72x72.png",
          tag: payload.tag,
          requireInteraction: payload.priority === "high",
        },
        fcm_options: {
          link: payload.clickAction,
        },
      },
    };
  }

  private buildMulticastMessage(
    tokens: string[],
    payload: NotificationPayload,
  ): any {
    return {
      tokens,
      notification: {
        title: payload.title,
        body: payload.body,
        image: payload.image,
      },
      data: payload.data || {},
      android: {
        priority: payload.priority === "high" ? "high" : "normal",
        ttl: payload.ttl || 86400,
        notification: {
          icon: "ic_notification",
          color: "#4F46E5",
          sound: "default",
          channel_id: "default",
          click_action: payload.clickAction,
        },
      },
      apns: {
        payload: {
          aps: {
            alert: {
              title: payload.title,
              body: payload.body,
            },
            badge: 1,
            sound: "default",
          },
        },
      },
      webpush: {
        notification: {
          icon: payload.icon || "/icon-192x192.png",
          badge: payload.badge || "/badge-72x72.png",
          tag: payload.tag,
        },
        fcm_options: {
          link: payload.clickAction,
        },
      },
    };
  }

  private buildTopicMessage(
    topic: string,
    payload: NotificationPayload,
  ): FcmMessagePayload {
    const message = this.buildFcmMessage("", payload);
    delete (message as any).token;
    return { ...message, topic };
  }

  private async markTokensInvalid(tokens: string[]): Promise<void> {
    try {
      const supabase = await createClient();
      await supabase
        .from("user_fcm_tokens")
        .update({ is_active: false })
        .in("token", tokens);
    } catch (error) {
      routeLogger.error("Failed to mark tokens invalid", error, {
        tokenCount: tokens.length,
      });
    }
  }

  private isNotificationTypeEnabled(
    preferences: any,
    type: NotificationType,
  ): boolean {
    if (!preferences) return true;

    const typeMapping: Record<NotificationType, string> = {
      booking_created: "booking_notifications",
      booking_confirmed: "booking_notifications",
      booking_cancelled: "booking_notifications",
      booking_reminder: "reminder_notifications",
      job_reminder: "reminder_notifications",
      payment_received: "payment_notifications",
      payment_failed: "payment_notifications",
      new_message: "message_notifications",
      review_request: "review_notifications",
      worker_application: "booking_notifications",
      application_accepted: "booking_notifications",
      application_rejected: "booking_notifications",
      shift_reminder: "reminder_notifications",
      check_in_reminder: "reminder_notifications",
      check_out_reminder: "reminder_notifications",
    };

    const prefKey = typeMapping[type];
    return preferences[prefKey] ?? true;
  }

  private isQuietHours(preferences: any): boolean {
    if (!preferences?.quiet_hours_enabled) return false;

    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();

    const [startH, startM] = (preferences.quiet_hours_start || "22:00")
      .split(":")
      .map(Number);
    const [endH, endM] = (preferences.quiet_hours_end || "07:00")
      .split(":")
      .map(Number);

    const startMinutes = startH * 60 + startM;
    const endMinutes = endH * 60 + endM;

    // Handle overnight quiet hours (e.g., 22:00 - 07:00)
    if (startMinutes > endMinutes) {
      return currentTime >= startMinutes || currentTime < endMinutes;
    }

    return currentTime >= startMinutes && currentTime < endMinutes;
  }

  private async storeNotification(
    userId: string,
    type: NotificationType,
    payload: NotificationPayload,
  ): Promise<void> {
    try {
      const supabase = await createClient();
      await supabase.from("notifications").insert({
        user_id: userId,
        type,
        title: payload.title,
        message: payload.body,
        data: payload.data || {},
        is_read: false,
      });
    } catch (error) {
      routeLogger.error("Failed to store notification", error, {
        userId,
        type,
      });
    }
  }
}

// Export singleton instance
export const notificationService = new NotificationService();

// Export convenience functions
export const sendToUser =
  notificationService.sendToUser.bind(notificationService);
export const sendToUsers =
  notificationService.sendToUsers.bind(notificationService);
export const sendToTopic =
  notificationService.sendToTopic.bind(notificationService);
