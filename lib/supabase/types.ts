export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json }
  | Json[]
 
export interface Database {
  public: {
    Tables: {
      users: {
        Row: {
          id: string
          email: string
          full_name: string
          avatar_url: string
          role: 'worker' | 'business'
          phone: string
          created_at: string
          updated_at: string
        }
      }
      businesses: {
        Row: {
          id: string
          user_id: string
          name: string
          description: string
          phone: string
          email: string
          website: string
          is_verified: boolean
          address: string
          lat: number
          lng: number
          created_at: string
          updated_at: string
        }
      }
      workers: {
        Row: {
          id: string
          user_id: string
          full_name: string
          bio: string
          avatar_url: string
          phone: string
          dob: string
          address: string
          location_name: string
          lat: number
          lng: number
          created_at: string
          updated_at: string
        }
      }
      skills: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
        }
      }
      categories: {
        Row: {
          id: string
          name: string
          slug: string
          created_at: string
        }
      }
      jobs: {
        Row: {
          id: string
          business_id: string
          category_id: string
          title: string
          description: string
          requirements: string
          budget_min: number
          budget_max: number
          status: 'open' | 'in_progress' | 'completed' | 'cancelled'
          deadline: string
          address: string
          lat: number
          lng: number
          created_at: string
          updated_at: string
        }
      }
      jobs_skills: {
        Row: {
          job_id: string
          skill_id: string
        }
      }
      bookings: {
        Row: {
          id: string
          job_id: string
          worker_id: string
          business_id: string
          status: 'pending' | 'accepted' | 'rejected' | 'in_progress' | 'completed' | 'cancelled'
          start_date: string
          end_date: string
          final_price: number
          booking_notes: string
          created_at: string
          updated_at: string
        }
      }
      transactions: {
        Row: {
          id: string
          booking_id: string
          amount: number
          type: 'payment' | 'refund'
          status: 'pending' | 'success' | 'failed'
          provider_transaction_id: string
          created_at: string
        }
      }
      messages: {
        Row: {
          id: string
          sender_id: string
          receiver_id: string
          booking_id: string
          content: string
          is_read: boolean
          created_at: string
        }
      }
      reviews: {
        Row: {
          id: string
          booking_id: string
          worker_id: string
          rating: number
          comment: string
          created_at: string
        }
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          title: string
          body: string
          link: string
          is_read: boolean
          created_at: string
        }
      }
      reports: {
        Row: {
          id: string
          reporter_id: string
          reported_type: 'user' | 'job' | 'business' | 'booking'
          reported_id: string
          reason: string
          status: 'pending' | 'reviewing' | 'resolved' | 'dismissed'
          created_at: string
        }
      }
      webhooks: {
        Row: {
          id: string
          url: string
          secret: string
          events: string[]
          is_active: boolean
          created_at: string
        }
      }
    }
  }
}
