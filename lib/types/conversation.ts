import { Database } from "../supabase/types";

type ConversationRow = Database["public"]["Tables"]["conversations"]["Row"];
type UserRow = Database["public"]["Tables"]["users"]["Row"];
type BookingRow = Database["public"]["Tables"]["bookings"]["Row"];

export type BookingStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "in_progress"
  | "completed"
  | "cancelled";

export interface Conversation {
  id: string;
  booking_id: string;
  worker_id: string;
  business_id: string;
  last_message_id: string | null;
  last_message_at: string | null;
  unread_worker_count: number;
  unread_business_count: number;
  created_at: string;
  updated_at: string;
}

export interface ConversationWithRelations extends Conversation {
  worker: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: "worker" | "business" | "admin";
  };
  business: {
    id: string;
    full_name: string;
    avatar_url: string | null;
    role: "worker" | "business" | "admin";
  };
  booking?: {
    id: string;
    job_id: string;
    status: BookingStatus;
  };
  last_message?: {
    id: string;
    content: string;
    sender_id: string;
    receiver_id: string;
    created_at: string;
  };
}

export interface CreateConversationInput {
  booking_id: string;
  worker_id: string;
  business_id: string;
}

export interface ConversationListParams {
  user_id: string;
  page?: number;
  limit?: number;
}

export interface ConversationListResponse {
  conversations: ConversationWithRelations[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}
