"use server";

import { createClient } from "../supabase/server";
import type { Database } from "../supabase/types";
import { createNotification } from "./notifications";
import { notificationService } from "../notifications/service";
import type { MessageWithRelations } from "../types/message";

type Message = Database["public"]["Tables"]["messages"]["Row"];

// Type for inserting a new message
type MessageInsert = Pick<
  Message,
  "sender_id" | "receiver_id" | "content" | "booking_id" | "is_read"
>;

export type MessageResult = {
  success: boolean;
  error?: string;
  data?: Message;
};

export type MessagesListResult = {
  success: boolean;
  error?: string;
  data?: MessageWithRelations[];
  count?: number;
};

export type RawMessagesListResult = {
  success: boolean;
  error?: string;
  data?: Message[];
  count?: number;
};

export type ConversationResult = {
  success: boolean;
  error?: string;
  data?: Array<{
    id: string;
    participant_id: string;
    participant_name: string;
    participant_avatar?: string;
    last_message: string;
    last_message_time: string;
    unread_count: number;
  }>;
  count?: number;
};

/**
 * Send a new message from one user to another
 * Authorization: sender must have a booking relationship with receiver
 * (business-worker or worker-business via an active booking)
 */
export async function sendMessage(
  senderId: string,
  receiverId: string,
  content: string,
  bookingId?: string,
): Promise<MessageResult> {
  try {
    const supabase = await createClient();

    // Booking scope authorization: prevent messaging unconnected users
    // Get sender profile to determine their role
    const { data: senderProfile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", senderId)
      .single();

    const senderRole = senderProfile?.role || "worker";

    // Only check booking relationship if sender is not messaging themselves
    if (senderId !== receiverId && senderRole !== "admin") {
      // Check for an active booking between sender and receiver
      const { data: booking } = await supabase
        .from("bookings")
        .select("id")
        .eq("status", "active")
        .or(
          senderRole === "business"
            ? `and(business_id.eq.${senderId},worker_id.eq.${receiverId})`
            : `and(worker_id.eq.${senderId},business_id.eq.${receiverId})`,
        )
        .limit(1)
        .single();

      if (!booking) {
        return {
          success: false,
          error: "Anda tidak dapat mengirim pesan ke pengguna ini tanpa booking yang aktif",
        };
      }
    }

    const newMessage: MessageInsert = {
      sender_id: senderId,
      receiver_id: receiverId,
      content,
      booking_id: bookingId || null,
      is_read: false,
    };

    const { data, error } = await supabase
      .from("messages")
      .insert(newMessage)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: `Gagal mengirim pesan: ${error.message}`,
      };
    }

    // Create notification for the receiver
    try {
      // Fetch sender's user profile to get their name
      const { data: senderProfile } = await supabase
        .from("users")
        .select("full_name")
        .eq("id", senderId)
        .single();

      const senderName = senderProfile?.full_name || "Seseorang";
      const messagePreview =
        content.length > 100 ? content.substring(0, 100) + "..." : content;

      await createNotification(
        receiverId,
        `Pesan Baru dari ${senderName}`,
        messagePreview,
        "/messages",
      );

      // Send FCM push notification to the receiver
      await notificationService.sendNewMessage(
        receiverId,
        senderName,
        content,
        receiverId,
      );
    } catch (notificationError) {
      // Don't fail the message send if notification creation fails
      // The message was already sent successfully
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengirim pesan" };
  }
}

/**
 * Mark a specific message as read
 */
export async function markMessageAsRead(
  messageId: string,
  userId: string,
): Promise<MessageResult> {
  try {
    const supabase = await createClient();

    // Verify the message is sent to the user
    const { data: message, error: fetchError } = await supabase
      .from("messages")
      .select("*")
      .eq("id", messageId)
      .eq("receiver_id", userId)
      .single();

    if (fetchError || !message) {
      return { success: false, error: "Pesan tidak ditemukan" };
    }

    // Update the message as read
    const { data, error } = await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("id", messageId)
      .eq("receiver_id", userId)
      .select()
      .single();

    if (error) {
      return {
        success: false,
        error: `Gagal menandai pesan: ${error.message}`,
      };
    }

    return { success: true, data };
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat menandai pesan" };
  }
}

/**
 * Mark all messages as read for a specific user (messages received by the user)
 */
export async function markAllMessagesAsRead(
  userId: string,
): Promise<MessageResult> {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("messages")
      .update({ is_read: true })
      .eq("receiver_id", userId)
      .eq("is_read", false)
      .select();

    if (error) {
      return {
        success: false,
        error: `Gagal menandai semua pesan: ${error.message}`,
      };
    }

    return { success: true, data: data?.[0] };
  } catch (error) {
    return {
      success: false,
      error: "Terjadi kesalahan saat menandai semua pesan",
    };
  }
}

/**
 * Get unread message count for a user
 */
export async function getUnreadMessageCount(
  userId: string,
): Promise<{ success: boolean; count?: number; error?: string }> {
  try {
    const supabase = await createClient();

    const { count, error } = await supabase
      .from("messages")
      .select("*", { count: "exact", head: true })
      .eq("receiver_id", userId)
      .eq("is_read", false);

    if (error) {
      return {
        success: false,
        error: `Gagal mengambil jumlah pesan: ${error.message}`,
      };
    }

    return { success: true, count: count || 0 };
  } catch (error) {
    return {
      success: false,
      error: "Terjadi kesalahan saat mengambil jumlah pesan",
    };
  }
}

/**
 * Get messages between two users, ordered by created_at (newest first)
 */
export async function getMessages(
  userId: string,
  otherUserId: string,
  limit: number = 50,
): Promise<MessagesListResult> {
  try {
    const supabase = await createClient();

    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .or(
        `and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`,
      )
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return {
        success: false,
        error: `Gagal mengambil pesan: ${error.message}`,
      };
    }

    if (!messages || messages.length === 0) {
      return { success: true, data: [], count: 0 };
    }

    // Get unique user IDs from messages
    const userIds = new Set<string>();
    messages.forEach((msg) => {
      userIds.add(msg.sender_id);
      userIds.add(msg.receiver_id);
    });

    // Fetch user data for all users involved
    const { data: users } = await supabase
      .from("users")
      .select("id, full_name, avatar_url, role")
      .in("id", Array.from(userIds));

    const userMap = new Map(users?.map((u) => [u.id, u]) || []);

    // Enrich messages with user data
    const enrichedMessages = messages.map((msg) => ({
      ...msg,
      sender: userMap.get(msg.sender_id) || {
        id: msg.sender_id,
        full_name: "Unknown",
        avatar_url: null,
        role: "worker" as const,
      },
      receiver: userMap.get(msg.receiver_id) || {
        id: msg.receiver_id,
        full_name: "Unknown",
        avatar_url: null,
        role: "worker" as const,
      },
    }));

    return {
      success: true,
      data: enrichedMessages,
      count: enrichedMessages.length,
    };
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengambil pesan" };
  }
}

/**
 * Get all messages for a user (both sent and received), ordered by created_at (newest first)
 */
export async function getUserMessages(
  userId: string,
  limit: number = 50,
): Promise<MessagesListResult> {
  try {
    const supabase = await createClient();

    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) {
      return {
        success: false,
        error: `Gagal mengambil pesan: ${error.message}`,
      };
    }

    if (!messages || messages.length === 0) {
      return { success: true, data: [], count: 0 };
    }

    // Get unique user IDs from messages
    const userIds = new Set<string>();
    messages.forEach((msg) => {
      userIds.add(msg.sender_id);
      userIds.add(msg.receiver_id);
    });

    // Fetch user data for all users involved
    const { data: users } = await supabase
      .from("users")
      .select("id, full_name, avatar_url, role")
      .in("id", Array.from(userIds));

    const userMap = new Map(users?.map((u) => [u.id, u]) || []);

    // Enrich messages with user data
    const enrichedMessages = messages.map((msg) => ({
      ...msg,
      sender: userMap.get(msg.sender_id) || {
        id: msg.sender_id,
        full_name: "Unknown",
        avatar_url: null,
        role: "worker" as const,
      },
      receiver: userMap.get(msg.receiver_id) || {
        id: msg.receiver_id,
        full_name: "Unknown",
        avatar_url: null,
        role: "worker" as const,
      },
    }));

    return {
      success: true,
      data: enrichedMessages,
      count: enrichedMessages.length,
    };
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengambil pesan" };
  }
}

/**
 * Get unread messages for a user
 */
export async function getUnreadMessages(
  userId: string,
): Promise<MessagesListResult> {
  try {
    const supabase = await createClient();

    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .eq("receiver_id", userId)
      .eq("is_read", false)
      .order("created_at", { ascending: false });

    if (error) {
      return {
        success: false,
        error: `Gagal mengambil pesan: ${error.message}`,
      };
    }

    if (!messages || messages.length === 0) {
      return { success: true, data: [], count: 0 };
    }

    // Get unique user IDs from messages
    const userIds = new Set<string>();
    messages.forEach((msg) => {
      userIds.add(msg.sender_id);
      userIds.add(msg.receiver_id);
    });

    // Fetch user data for all users involved
    const { data: users } = await supabase
      .from("users")
      .select("id, full_name, avatar_url, role")
      .in("id", Array.from(userIds));

    const userMap = new Map(users?.map((u) => [u.id, u]) || []);

    // Enrich messages with user data
    const enrichedMessages = messages.map((msg) => ({
      ...msg,
      sender: userMap.get(msg.sender_id) || {
        id: msg.sender_id,
        full_name: "Unknown",
        avatar_url: null,
        role: "worker" as const,
      },
      receiver: userMap.get(msg.receiver_id) || {
        id: msg.receiver_id,
        full_name: "Unknown",
        avatar_url: null,
        role: "worker" as const,
      },
    }));

    return {
      success: true,
      data: enrichedMessages,
      count: enrichedMessages.length,
    };
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengambil pesan" };
  }
}

/**
 * Get messages for a specific booking
 */
export async function getBookingMessages(
  bookingId: string,
  limit: number = 50,
): Promise<MessagesListResult> {
  try {
    const supabase = await createClient();

    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .eq("booking_id", bookingId)
      .order("created_at", { ascending: true })
      .limit(limit);

    if (error) {
      return {
        success: false,
        error: `Gagal mengambil pesan: ${error.message}`,
      };
    }

    if (!messages || messages.length === 0) {
      return { success: true, data: [], count: 0 };
    }

    // Get unique user IDs from messages
    const userIds = new Set<string>();
    messages.forEach((msg) => {
      userIds.add(msg.sender_id);
      userIds.add(msg.receiver_id);
    });

    // Fetch user data for all users involved
    const { data: users } = await supabase
      .from("users")
      .select("id, full_name, avatar_url, role")
      .in("id", Array.from(userIds));

    const userMap = new Map(users?.map((u) => [u.id, u]) || []);

    // Enrich messages with user data
    const enrichedMessages = messages.map((msg) => ({
      ...msg,
      sender: userMap.get(msg.sender_id) || {
        id: msg.sender_id,
        full_name: "Unknown",
        avatar_url: null,
        role: "worker" as const,
      },
      receiver: userMap.get(msg.receiver_id) || {
        id: msg.receiver_id,
        full_name: "Unknown",
        avatar_url: null,
        role: "worker" as const,
      },
    }));

    return {
      success: true,
      data: enrichedMessages,
      count: enrichedMessages.length,
    };
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat mengambil pesan" };
  }
}

/**
 * Get all conversations for a user
 * Returns a list of unique conversations with last message and unread count
 */
export async function getConversations(
  userId: string,
): Promise<ConversationResult> {
  try {
    const supabase = await createClient();

    // Get all messages where user is sender or receiver
    const { data: messages, error } = await supabase
      .from("messages")
      .select("*")
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order("created_at", { ascending: false });

    if (error) {
      return {
        success: false,
        error: `Gagal mengambil percakapan: ${error.message}`,
      };
    }

    if (!messages || messages.length === 0) {
      return { success: true, data: [], count: 0 };
    }

    // Group messages by conversation partner
    const conversationMap = new Map<
      string,
      {
        participant_id: string;
        last_message: Message;
        unread_count: number;
      }
    >();

    messages.forEach((msg) => {
      const partnerId =
        msg.sender_id === userId ? msg.receiver_id : msg.sender_id;

      if (!conversationMap.has(partnerId)) {
        conversationMap.set(partnerId, {
          participant_id: partnerId,
          last_message: msg,
          unread_count: msg.receiver_id === userId && !msg.is_read ? 1 : 0,
        });
      } else {
        const conv = conversationMap.get(partnerId)!;
        // Count unread messages
        if (msg.receiver_id === userId && !msg.is_read) {
          conv.unread_count++;
        }
      }
    });

    // Fetch participant details (users table)
    const participantIds = Array.from(conversationMap.keys());
    const { data: participants } = await supabase
      .from("users")
      .select("id, full_name, avatar_url")
      .in("id", participantIds);

    // Build conversation list with participant info
    const conversations = Array.from(conversationMap.values()).map((conv) => {
      const participant = participants?.find(
        (p) => p.id === conv.participant_id,
      );
      return {
        id: conv.participant_id, // Use participant ID as conversation ID
        participant_id: conv.participant_id,
        participant_name: participant?.full_name || "Unknown",
        participant_avatar: participant?.avatar_url,
        last_message: conv.last_message.content,
        last_message_time: conv.last_message.created_at,
        unread_count: conv.unread_count,
      };
    });

    return { success: true, data: conversations, count: conversations.length };
  } catch (error) {
    return {
      success: false,
      error: "Terjadi kesalahan saat mengambil percakapan",
    };
  }
}

/**
 * Delete a specific message
 */
export async function deleteMessage(
  messageId: string,
  userId: string,
): Promise<MessageResult> {
  try {
    const supabase = await createClient();

    // Verify the message belongs to the user (either sender or receiver)
    const { data: message, error: fetchError } = await supabase
      .from("messages")
      .select("*")
      .eq("id", messageId)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .single();

    if (fetchError || !message) {
      return { success: false, error: "Pesan tidak ditemukan" };
    }

    // Delete the message
    const { error } = await supabase
      .from("messages")
      .delete()
      .eq("id", messageId)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`);

    if (error) {
      return {
        success: false,
        error: `Gagal menghapus pesan: ${error.message}`,
      };
    }

    return { success: true, data: message };
  } catch (error) {
    return { success: false, error: "Terjadi kesalahan saat menghapus pesan" };
  }
}
