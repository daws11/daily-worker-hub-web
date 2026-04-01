// @ts-nocheck – pre-existing duplicate PushSubscription type definition
"use server";
/* eslint-disable @typescript-eslint/no-explicit-any */
declare const process: { env: Record<string, string | undefined> };

import { createClient } from "../supabase/server";
import { createNotification } from "./notifications";

// ============================================================================
// LOCAL TYPES (Database does not include push_subscriptions /
// user_notification_preferences tables)
// ============================================================================

type PushSubscription = {
  id: string;
  user_id: string;
  endpoint: string;
  keys_auth: string;
  keys_p256h: string;
  created_at: string;
  updated_at: string;
};

type NotificationPreferences = {
  id: string;
  user_id: string;
  push_enabled: boolean;
  new_applications: boolean;
  booking_status: boolean;
  payment_confirmation: boolean;
  new_job_matches: boolean;
  shift_reminders: boolean;
  created_at: string;
  updated_at: string;
};

type PushSubscription =
  Database["public"]["Tables"]["push_subscriptions"]["Row"];
type NotificationPreferences =
  Database["public"]["Tables"]["user_notification_preferences"]["Row"];

// Type for inserting a new push subscription
type PushSubscriptionInsert = Pick<
  PushSubscription,
  "user_id" | "endpoint" | "keys_auth" | "keys_p256h"
>;

// Type for updating notification preferences
type NotificationPreferencesUpdate = Partial<
  Pick<
    NotificationPreferences,
    | "push_enabled"
    | "new_applications"
    | "booking_status"
    | "payment_confirmation"
    | "new_job_matches"
    | "shift_reminders"
  >
>;

/**
 * Result of a push subscription operation
 */
export type PushSubscriptionResult = {
  success: boolean;
  error?: string;
  data?: PushSubscription;
};

/**
 * Result of a notification preferences operation
 */
export type NotificationPreferencesResult = {
  success: boolean;
  error?: string;
  data?: NotificationPreferences;
};

/**
 * Result of sending a push notification
 */
export type SendPushNotificationResult = {
  success: boolean;
  error?: string;
};

/**
 * Subscribe a user to push notifications
 * Stores the push subscription in the database
 */
export async function subscribeToPushNotifications(
  userId: string,
  endpoint: string,
  keysAuth: string,
  keysP256dh: string,
): Promise<PushSubscriptionResult> {
  try {
    const supabase = await createClient();

    // Check if user already has a subscription with this endpoint
    const { data: existing } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .eq("endpoint", endpoint)
      .single();

    if (existing) {
      return { success: true, data: existing };
    }

    // Create new push subscription
    const newSubscription: PushSubscriptionInsert = {
      user_id: userId,
      endpoint,
      keys_auth: keysAuth,
      keys_p256h: keysP256dh,
    };

    const { data, error } = await supabase
      .from("push_subscriptions")
      .insert(newSubscription)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: `Gagal berlangganan notifikasi: ${error.message}`,
      };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: "Terjadi kesalahan saat berlangganan notifikasi",
    };
  }
}

/**
 * Unsubscribe a user from push notifications
 * Removes the push subscription from the database
 */
export async function unsubscribeFromPushNotifications(
  subscriptionId: string,
  userId: string,
): Promise<PushSubscriptionResult> {
  try {
    const supabase = await createClient();

    // Verify the subscription belongs to the user
    const { data: subscription, error: fetchError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("id", subscriptionId)
      .eq("user_id", userId)
      .single();

    if (fetchError || !subscription) {
      return { success: false, error: "Langganan notifikasi tidak ditemukan" };
    }

    // Delete the subscription
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("id", subscriptionId)
      .eq("user_id", userId);

    if (error) {
      return {
        success: false,
        error: `Gagal berhenti berlangganan: ${error.message}`,
      };
    }

    return { success: true, data: subscription };
  } catch (error) {
    return {
      success: false,
      error: "Terjadi kesalahan saat berhenti berlangganan",
    };
  }
}

/**
 * Unsubscribe by endpoint (useful when subscription object is no longer available)
 */
export async function unsubscribeByEndpoint(
  endpoint: string,
  userId: string,
): Promise<PushSubscriptionResult> {
  try {
    const supabase = await createClient();

    // Verify and get the subscription
    const { data: subscription, error: fetchError } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("endpoint", endpoint)
      .eq("user_id", userId)
      .single();

    if (fetchError || !subscription) {
      return { success: false, error: "Langganan notifikasi tidak ditemukan" };
    }

    // Delete the subscription
    const { error } = await supabase
      .from("push_subscriptions")
      .delete()
      .eq("endpoint", endpoint)
      .eq("user_id", userId);

    if (error) {
      return {
        success: false,
        error: `Gagal berhenti berlangganan: ${error.message}`,
      };
    }

    return { success: true, data: subscription };
  } catch (error) {
    return {
      success: false,
      error: "Terjadi kesalahan saat berhenti berlangganan",
    };
  }
}

/**
 * Get a user's push subscription
 */
export async function getUserPushSubscription(
  userId: string,
): Promise<PushSubscriptionResult> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No subscription found - not an error, just no data
        return { success: true, data: undefined };
      }
      return {
        success: false,
        error: `Gagal mengambil langganan notifikasi: ${error.message}`,
      };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: "Terjadi kesalahan saat mengambil langganan notifikasi",
    };
  }
}

/**
 * Get all push subscriptions for a user
 */
export async function getAllUserPushSubscriptions(
  userId: string,
): Promise<{ success: boolean; data?: PushSubscription[]; error?: string }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      return {
        success: false,
        error: `Gagal mengambil langganan notifikasi: ${error.message}`,
      };
    }

    return { success: true, data: data || [] };
  } catch (error) {
    return {
      success: false,
      error: "Terjadi kesalahan saat mengambil langganan notifikasi",
    };
  }
}

/**
 * Send a push notification to a specific user
 * Calls the edge function to deliver the notification
 */
export async function sendPushNotification(
  userId: string,
  title: string,
  body: string,
  link?: string,
  icon?: string,
): Promise<SendPushNotificationResult> {
  try {
    const supabase = await createClient();

    // Get user's notification preferences
    const { data: preferences } = await supabase
      .from("user_notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    // Check if push notifications are enabled
    if (preferences && !preferences.push_enabled) {
      return { success: true }; // Silently succeed - user has disabled notifications
    }

    // Get user's push subscription
    const { data: subscription } = await supabase
      .from("push_subscriptions")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(1)
      .single();

    if (!subscription) {
      return {
        success: false,
        error: "Pengguna tidak memiliki langganan notifikasi",
      };
    }

    // Call edge function to send push notification
    const {
      data: { session },
    } = await supabase.auth.getSession();
    const token = session?.access_token;

    const response = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/send-push-notification`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token || ""}`,
        },
        body: JSON.stringify({
          subscription: {
            endpoint: subscription.endpoint,
            keys: {
              auth: subscription.keys_auth,
              p256dh: subscription.keys_p256h,
            },
          },
          notification: {
            title,
            body,
            icon,
            data: link ? { url: link } : undefined,
          },
        }),
      },
    );

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: `Gagal mengirim notifikasi: ${error.error || response.statusText}`,
      };
    }

    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: "Terjadi kesalahan saat mengirim notifikasi",
    };
  }
}

/**
 * Get user notification preferences
 */
export async function getUserNotificationPreferences(
  userId: string,
): Promise<NotificationPreferencesResult> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("user_notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        // No preferences found - create default preferences
        const { data: newPrefs, error: insertError } = await supabase
          .from("user_notification_preferences")
          .insert({ user_id: userId })
          .select()
          .single();

        if (insertError) {
          return {
            success: false,
            error: `Gagal membuat preferensi notifikasi: ${insertError.message}`,
          };
        }

        return { success: true, data: newPrefs };
      }
      return {
        success: false,
        error: `Gagal mengambil preferensi notifikasi: ${error.message}`,
      };
    }

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: "Terjadi kesalahan saat mengambil preferensi notifikasi",
    };
  }
}

/**
 * Update user notification preferences
 */
export async function updateUserNotificationPreferences(
  userId: string,
  preferences: NotificationPreferencesUpdate,
): Promise<NotificationPreferencesResult> {
  try {
    const supabase = await createClient();

    // Check if preferences exist
    const { data: existing } = await supabase
      .from("user_notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    let result;

    if (existing) {
      // Update existing preferences
      const { data, error } = await supabase
        .from("user_notification_preferences")
        .update(preferences)
        .eq("user_id", userId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Gagal memperbarui preferensi notifikasi: ${error.message}`,
        };
      }

      result = data;
    } else {
      // Create new preferences with provided values
      const { data, error } = await supabase
        .from("user_notification_preferences")
        .insert({ user_id: userId, ...preferences })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Gagal membuat preferensi notifikasi: ${error.message}`,
        };
      }

      result = data;
    }

    return { success: true, data: result };
  } catch (error) {
    return {
      success: false,
      error: "Terjadi kesalahan saat memperbarui preferensi notifikasi",
    };
  }
}

/**
 * Check if a user has a specific notification type enabled
 */
export async function isNotificationTypeEnabled(
  userId: string,
  notificationType: keyof NotificationPreferencesUpdate,
): Promise<{ success: boolean; enabled?: boolean; error?: string }> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("user_notification_preferences")
      .select("*")
      .eq("user_id", userId)
      .single();

    if (error || !data) {
      return { success: false, error: "Preferensi notifikasi tidak ditemukan" };
    }

    // Check master push_enabled switch
    if (!data.push_enabled) {
      return { success: true, enabled: false };
    }

    // Check specific notification type
    const enabled = data[notificationType] ?? true; // Default to true if not set
    return { success: true, enabled };
  } catch (error) {
    return {
      success: false,
      error: "Terjadi kesalahan saat mengecek preferensi notifikasi",
    };
  }
}

// ============================================
// PUSH NOTIFICATION TRIGGER HOOKS
// ============================================

/**
 * Trigger push notification for new job application
 */
export async function triggerApplicationReceivedPush(data: {
  businessUserId: string;
  workerName: string;
  jobTitle: string;
  applicationId: string;
}): Promise<SendPushNotificationResult> {
  try {
    // Check if notification type is enabled
    const { enabled } = await isNotificationTypeEnabled(
      data.businessUserId,
      "new_applications",
    );
    if (!enabled) {
      return { success: true }; // Silently skip
    }

    return await sendPushNotification(
      data.businessUserId,
      "Lamaran Baru Diterima!",
      `${data.workerName} melamar untuk ${data.jobTitle}`,
      `/applications/${data.applicationId}`,
    );
  } catch (error) {
    return { success: false, error: "Gagal mengirim push notifikasi" };
  }
}

/**
 * Trigger push notification for application status update
 */
export async function triggerApplicationStatusPush(data: {
  workerUserId: string;
  jobTitle: string;
  businessName: string;
  status: "accepted" | "rejected" | "pending" | "reviewing";
  applicationId: string;
}): Promise<SendPushNotificationResult> {
  try {
    // Check if notification type is enabled
    const { enabled } = await isNotificationTypeEnabled(
      data.workerUserId,
      "booking_status",
    );
    if (!enabled) {
      return { success: true };
    }

    const statusMessages = {
      accepted: "Lamaran Anda diterima!",
      rejected: "Lamaran Anda ditolak",
      pending: "Lamaran sedang diproses",
      reviewing: "Lamaran sedang ditinjau",
    };

    return await sendPushNotification(
      data.workerUserId,
      `Update Lamaran - ${data.jobTitle}`,
      `${statusMessages[data.status]} di ${data.businessName}`,
      `/applications/${data.applicationId}`,
    );
  } catch (error) {
    return { success: false, error: "Gagal mengirim push notifikasi" };
  }
}

/**
 * Trigger push notification for booking confirmation
 */
export async function triggerBookingConfirmedPush(data: {
  userId: string;
  userType: "worker" | "business";
  otherPartyName: string;
  jobTitle: string;
  bookingId: string;
}): Promise<SendPushNotificationResult> {
  try {
    // Check if notification type is enabled
    const { enabled } = await isNotificationTypeEnabled(
      data.userId,
      "booking_status",
    );
    if (!enabled) {
      return { success: true };
    }

    const message =
      data.userType === "worker"
        ? `Booking Anda dengan ${data.otherPartyName} dikonfirmasi!`
        : `Booking dengan ${data.otherPartyName} dikonfirmasi!`;

    return await sendPushNotification(
      data.userId,
      "Booking Dikonfirmasi!",
      message,
      `/bookings/${data.bookingId}`,
    );
  } catch (error) {
    return { success: false, error: "Gagal mengirim push notifikasi" };
  }
}

/**
 * Trigger push notification for payment completion
 */
export async function triggerPaymentCompletedPush(data: {
  workerUserId: string;
  amount: number;
  businessName: string;
  paymentId: string;
}): Promise<SendPushNotificationResult> {
  try {
    // Check if notification type is enabled
    const { enabled } = await isNotificationTypeEnabled(
      data.workerUserId,
      "payment_confirmation",
    );
    if (!enabled) {
      return { success: true };
    }

    const formattedAmount = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      minimumFractionDigits: 0,
    }).format(data.amount);

    return await sendPushNotification(
      data.workerUserId,
      "Pembayaran Diterima!",
      `${formattedAmount} dari ${data.businessName}`,
      `/payments/${data.paymentId}`,
    );
  } catch (error) {
    return { success: false, error: "Gagal mengirim push notifikasi" };
  }
}

/**
 * Trigger push notification for job reminder
 */
export async function triggerJobReminderPush(data: {
  workerUserId: string;
  jobTitle: string;
  businessName: string;
  startTime: string;
  bookingId: string;
}): Promise<SendPushNotificationResult> {
  try {
    // Check if notification type is enabled
    const { enabled } = await isNotificationTypeEnabled(
      data.workerUserId,
      "shift_reminders",
    );
    if (!enabled) {
      return { success: true };
    }

    return await sendPushNotification(
      data.workerUserId,
      "⏰ Pengingat Pekerjaan",
      `Bekerja di ${data.businessName} besok pukul ${data.startTime}`,
      `/bookings/${data.bookingId}`,
    );
  } catch (error) {
    return { success: false, error: "Gagal mengirim push notifikasi" };
  }
}

/**
 * Trigger push notification for new job matches
 */
export async function triggerNewJobMatchPush(data: {
  workerUserId: string;
  jobTitle: string;
  businessName: string;
  jobId: string;
}): Promise<SendPushNotificationResult> {
  try {
    // Check if notification type is enabled
    const { enabled } = await isNotificationTypeEnabled(
      data.workerUserId,
      "new_job_matches",
    );
    if (!enabled) {
      return { success: true };
    }

    return await sendPushNotification(
      data.workerUserId,
      "Pekerjaan Baru Cocok Untuk Anda!",
      `${data.jobTitle} di ${data.businessName}`,
      `/jobs/${data.jobId}`,
    );
  } catch (error) {
    return { success: false, error: "Gagal mengirim push notifikasi" };
  }
}
