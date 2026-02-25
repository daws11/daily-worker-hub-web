import { Database } from '../supabase/types'

type MessageRow = Database['public']['Tables']['messages']['Row']
type UserRow = Database['public']['Tables']['users']['Row']
type BookingRow = Database['public']['Tables']['bookings']['Row']

export type MessageSortOption = 'newest' | 'oldest'

export interface Message {
  id: string
  booking_id: string | null
  sender_id: string
  receiver_id: string
  content: string
  is_read: boolean
  created_at: string
}

export interface MessageWithRelations extends Message {
  sender: {
    id: string
    full_name: string
    avatar_url: string | null
    role: 'worker' | 'business'
  }
  receiver: {
    id: string
    full_name: string
    avatar_url: string | null
    role: 'worker' | 'business'
  }
  booking?: {
    id: string
    job_id: string
    status: 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'cancelled'
  }
}

export interface CreateMessageInput {
  receiver_id: string
  content: string
  booking_id?: string
}

export interface SendMessageInput extends CreateMessageInput {
  sender_id: string
}

export interface MessageListParams {
  booking_id?: string
  sender_id?: string
  receiver_id?: string
  unread_only?: boolean
  sort?: MessageSortOption
  page?: number
  limit?: number
}

export interface MessageListResponse {
  messages: MessageWithRelations[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface MessageConversation {
  other_user: {
    id: string
    full_name: string
    avatar_url: string | null
    role: 'worker' | 'business'
  }
  booking?: {
    id: string
    job_id: string
    status: 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'cancelled'
  }
  last_message: Message
  unread_count: number
}

export interface ConversationListParams {
  page?: number
  limit?: number
}

export interface ConversationListResponse {
  conversations: MessageConversation[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface UnreadCountResponse {
  total_unread: number
  by_booking: {
    booking_id: string
    count: number
  }[]
}

export interface MarkAsReadInput {
  message_id?: string
  booking_id?: string
  sender_id?: string
}
