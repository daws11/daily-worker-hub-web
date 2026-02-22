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
          role: 'worker' | 'business' | 'admin'
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
          business_type: 'hotel' | 'villa' | 'restaurant' | 'event_company' | 'other'
          address: string
          area: 'Badung' | 'Denpasar' | 'Gianyar' | 'Tabanan' | 'Buleleng' | 'Klungkung' | 'Karangasem' | 'Bangli' | 'Jembrana'
          phone?: string
          email?: string
          website?: string
          description?: string
          avatar_url?: string
          business_license_url?: string
          verification_status: 'pending' | 'verified' | 'rejected'
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
          gender: string | null
          experience_years: number | null
          kyc_status: 'unverified' | 'pending' | 'verified' | 'rejected'
          reliability_score: number
          created_at: string
          updated_at: string
        }
      }
      wallets: {
        Row: {
          id: string
          business_id: string | null
          worker_id: string | null
          balance: number
          currency: string
          is_active: boolean
          created_at: string
          updated_at: string
        }
      }
      kyc_verifications: {
        Row: {
          id: string
          worker_id: string
          ktp_number: string
          ktp_image_url: string | null
          selfie_image_url: string | null
          ktp_extracted_data: Json
          status: 'pending' | 'verified' | 'rejected'
          rejection_reason: string | null
          submitted_at: string
          verified_at: string | null
          created_at: string
          updated_at: string
          verified_by: string | null
        }
      }
      worker_skills: {
        Row: {
          worker_id: string
          skill_id: string
          created_at: string
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
          category_id?: string | null
          position_type?: string
          title: string
          description: string
          requirements: string
          budget_min: number
          budget_max: number
          status: 'draft' | 'open' | 'in_progress' | 'completed' | 'cancelled'
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
      payment_transactions: {
        Row: {
          id: string
          business_id: string
          amount: number
          status: 'pending' | 'success' | 'failed' | 'expired'
          payment_provider: 'xendit' | 'midtrans'
          provider_payment_id: string | null
          payment_url: string | null
          qris_expires_at: string | null
          paid_at: string | null
          failure_reason: string | null
          fee_amount: number
          metadata: Json
          created_at: string
          updated_at: string
        }
      }
      payout_requests: {
        Row: {
          id: string
          worker_id: string
          amount: number
          fee_amount: number
          net_amount: number
          status: 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
          bank_code: 'BCA' | 'BRI' | 'Mandiri' | 'BNI'
          bank_account_number: string
          bank_account_name: string
          payment_provider: string
          provider_payout_id: string | null
          provider_response: Json
          requested_at: string
          processed_at: string | null
          completed_at: string | null
          failed_at: string | null
          failure_reason: string | null
          metadata: Json
          created_at: string
          updated_at: string
        }
      }
      bank_accounts: {
        Row: {
          id: string
          worker_id: string
          bank_code: 'BCA' | 'BRI' | 'Mandiri' | 'BNI'
          bank_account_number: string
          bank_account_name: string
          is_primary: boolean
          created_at: string
          updated_at: string
        }
      }
    }
  }
}
