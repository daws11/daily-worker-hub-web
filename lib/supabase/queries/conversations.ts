import { supabase } from "../client";
import type { Database } from "../types";
import type {
  ConversationWithRelations,
  CreateConversationInput,
} from "../../types/conversation";

type ConversationRow = Database["public"]["Tables"]["conversations"]["Row"];
type ConversationInsert = Database["public"]["Tables"]["conversations"]["Insert"];
type ConversationUpdate = Database["public"]["Tables"]["conversations"]["Update"];

/**
 * Get all conversations for a user (worker or business)
 */
export async function getConversations(userId: string) {
  try {
    const { data, error } = await supabase
      .from("conversations")
      .select(
        `
        *,
        worker:users!conversations_worker_id_fkey(
          id,
          full_name,
          avatar_url,
          role
        ),
        business:users!conversations_business_id_fkey(
          id,
          full_name,
          avatar_url,
          role
        ),
        booking:bookings!conversations_booking_id_fkey(
          id,
          job_id,
          status
        ),
        last_message:messages!conversations_last_message_id_fkey(
          id,
          content,
          sender_id,
          receiver_id,
          created_at
        )
      `,
      )
      .or(`worker_id.eq.${userId},business_id.eq.${userId}`)
      .order("last_message_at", { ascending: false });

    if (error) {
      console.error("Error fetching conversations:", error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error("Unexpected error fetching conversations:", error);
    return { data: null, error };
  }
}

/**
 * Get a single conversation by booking ID
 */
export async function getConversationByBookingId(
  bookingId: string,
  userId: string,
) {
  try {
    const { data, error } = await supabase
      .from("conversations")
      .select(
        `
        *,
        worker:users!conversations_worker_id_fkey(
          id,
          full_name,
          avatar_url,
          role
        ),
        business:users!conversations_business_id_fkey(
          id,
          full_name,
          avatar_url,
          role
        ),
        booking:bookings!conversations_booking_id_fkey(
          id,
          job_id,
          status
        ),
        last_message:messages!conversations_last_message_id_fkey(
          id,
          content,
          sender_id,
          receiver_id,
          created_at
        )
      `,
      )
      .eq("booking_id", bookingId)
      .single();

    if (error) {
      console.error("Error fetching conversation by booking ID:", error);
      return { data: null, error };
    }

    // Verify user is a participant
    if (data && data.worker_id !== userId && data.business_id !== userId) {
      return { data: null, error: { message: "Not authorized" } };
    }

    return { data, error: null };
  } catch (error) {
    console.error("Unexpected error fetching conversation by booking ID:", error);
    return { data: null, error };
  }
}

/**
 * Get a single conversation by ID
 */
export async function getConversationById(conversationId: string) {
  try {
    const { data, error } = await supabase
      .from("conversations")
      .select(
        `
        *,
        worker:users!conversations_worker_id_fkey(
          id,
          full_name,
          avatar_url,
          role
        ),
        business:users!conversations_business_id_fkey(
          id,
          full_name,
          avatar_url,
          role
        ),
        booking:bookings!conversations_booking_id_fkey(
          id,
          job_id,
          status
        ),
        last_message:messages!conversations_last_message_id_fkey(
          id,
          content,
          sender_id,
          receiver_id,
          created_at
        )
      `,
      )
      .eq("id", conversationId)
      .single();

    if (error) {
      console.error("Error fetching conversation by ID:", error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error("Unexpected error fetching conversation by ID:", error);
    return { data: null, error };
  }
}

/**
 * Create a new conversation for a booking
 */
export async function createConversation(input: CreateConversationInput) {
  try {
    const { data, error } = await supabase
      .from("conversations")
      .insert({
        booking_id: input.booking_id,
        worker_id: input.worker_id,
        business_id: input.business_id,
        unread_worker_count: 0,
        unread_business_count: 0,
      } as ConversationInsert)
      .select()
      .single();

    if (error) {
      console.error("Error creating conversation:", error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error("Unexpected error creating conversation:", error);
    return { data: null, error };
  }
}

/**
 * Update the last message for a conversation
 */
export async function updateConversationLastMessage(
  conversationId: string,
  messageId: string,
  lastMessageAt: string,
) {
  try {
    const { data, error } = await supabase
      .from("conversations")
      .update({
        last_message_id: messageId,
        last_message_at: lastMessageAt,
      } as ConversationUpdate)
      .eq("id", conversationId)
      .select()
      .single();

    if (error) {
      console.error("Error updating conversation last message:", error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error("Unexpected error updating conversation last message:", error);
    return { data: null, error };
  }
}

/**
 * Increment the unread count for a conversation
 */
export async function incrementUnreadCount(
  conversationId: string,
  isWorker: boolean,
) {
  try {
    const column = isWorker ? "unread_worker_count" : "unread_business_count";

    const { data: conversation, error: fetchError } = await supabase
      .from("conversations")
      .select(column)
      .eq("id", conversationId)
      .single();

    if (fetchError) {
      console.error("Error fetching conversation for unread count:", fetchError);
      return { data: null, error: fetchError };
    }

    const currentCount = conversation?.[column] ?? 0;
    const { data, error } = await supabase
      .from("conversations")
      .update({
        [column]: currentCount + 1,
      } as ConversationUpdate)
      .eq("id", conversationId)
      .select()
      .single();

    if (error) {
      console.error("Error incrementing unread count:", error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error("Unexpected error incrementing unread count:", error);
    return { data: null, error };
  }
}

/**
 * Reset unread count for a conversation (when user views it)
 */
export async function resetUnreadCount(
  conversationId: string,
  isWorker: boolean,
) {
  try {
    const column = isWorker ? "unread_worker_count" : "unread_business_count";

    const { data, error } = await supabase
      .from("conversations")
      .update({
        [column]: 0,
      } as ConversationUpdate)
      .eq("id", conversationId)
      .select()
      .single();

    if (error) {
      console.error("Error resetting unread count:", error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error("Unexpected error resetting unread count:", error);
    return { data: null, error };
  }
}

/**
 * Get or create a conversation for a booking
 */
export async function getOrCreateConversation(
  bookingId: string,
  workerId: string,
  businessId: string,
) {
  try {
    // Try to find existing conversation
    const { data: existing, error: fetchError } = await supabase
      .from("conversations")
      .select("*")
      .eq("booking_id", bookingId)
      .single();

    if (fetchError && fetchError.code !== "PGRST116") {
      console.error("Error checking for existing conversation:", fetchError);
      return { data: null, error: fetchError };
    }

    if (existing) {
      return { data: existing, error: null };
    }

    // Create new conversation
    return await createConversation({ booking_id: bookingId, worker_id: workerId, business_id: businessId });
  } catch (error) {
    console.error("Unexpected error in getOrCreateConversation:", error);
    return { data: null, error };
  }
}
