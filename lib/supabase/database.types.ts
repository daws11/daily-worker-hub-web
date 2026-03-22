export type WorkerTier = "classic" | "pro" | "elite" | "champion";


export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]
export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          admin_id: string
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          ip_address: string | null
          new_values: Json | null
          old_values: Json | null
          reason: string | null
          user_agent: string | null
        }
        Insert: {
          action: string
          admin_id: string
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          reason?: string | null
          user_agent?: string | null
        }
        Update: {
          action?: string
          admin_id?: string
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          ip_address?: string | null
          new_values?: Json | null
          old_values?: Json | null
          reason?: string | null
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_admin_id_fkey"
            columns: ["admin_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      applications: {
        Row: {
          cover_letter: string | null
          created_at: string
          id: string
          job_id: string | null
          status: string | null
          updated_at: string
          worker_id: string | null
        }
        Insert: {
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          status?: string | null
          updated_at?: string
          worker_id?: string | null
        }
        Update: {
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_id?: string | null
          status?: string | null
          updated_at?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "applications_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          category: Database["public"]["Enums"]["badge_category"]
          created_at: string
          description: string | null
          icon: string | null
          id: string
          is_certified: boolean
          name: string
          provider_id: string | null
          slug: string
        }
        Insert: {
          category: Database["public"]["Enums"]["badge_category"]
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_certified?: boolean
          name: string
          provider_id?: string | null
          slug: string
        }
        Update: {
          category?: Database["public"]["Enums"]["badge_category"]
          created_at?: string
          description?: string | null
          icon?: string | null
          id?: string
          is_certified?: boolean
          name?: string
          provider_id?: string | null
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "badges_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      bank_accounts: {
        Row: {
          bank_account_name: string
          bank_account_number: string
          bank_code: Database["public"]["Enums"]["bank_code"]
          created_at: string
          id: string
          is_primary: boolean
          updated_at: string
          worker_id: string
        }
        Insert: {
          bank_account_name: string
          bank_account_number: string
          bank_code: Database["public"]["Enums"]["bank_code"]
          created_at?: string
          id?: string
          is_primary?: boolean
          updated_at?: string
          worker_id: string
        }
        Update: {
          bank_account_name?: string
          bank_account_number?: string
          bank_code?: Database["public"]["Enums"]["bank_code"]
          created_at?: string
          id?: string
          is_primary?: boolean
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bank_accounts_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      bookings: {
        Row: {
          actual_end_time: string | null
          actual_hours: number | null
          actual_start_time: string | null
          application_id: string | null
          business_id: string
          cancellation_note: string | null
          cancellation_reason_id: string | null
          cancelled_at: string | null
          check_in_at: string | null
          check_in_lat: number | null
          check_in_lng: number | null
          check_out_at: string | null
          check_out_lat: number | null
          check_out_lng: number | null
          checkout_time: string | null
          created_at: string
          end_date: string | null
          final_price: number | null
          id: string
          interview_duration: number | null
          interview_status: string | null
          job_id: string
          matching_score: number | null
          payment_id: string | null
          payment_status: Database["public"]["Enums"]["payment_status"] | null
          review_deadline: string | null
          start_date: string | null
          status: Database["public"]["Enums"]["booking_status"]
          time_to_hire: number | null
          total_amount: number | null
          updated_at: string
          worker_id: string
        }
        Insert: {
          actual_end_time?: string | null
          actual_hours?: number | null
          actual_start_time?: string | null
          application_id?: string | null
          business_id: string
          cancellation_note?: string | null
          cancellation_reason_id?: string | null
          cancelled_at?: string | null
          check_in_at?: string | null
          check_in_lat?: number | null
          check_in_lng?: number | null
          check_out_at?: string | null
          check_out_lat?: number | null
          check_out_lng?: number | null
          checkout_time?: string | null
          created_at?: string
          end_date?: string | null
          final_price?: number | null
          id?: string
          interview_duration?: number | null
          interview_status?: string | null
          job_id: string
          matching_score?: number | null
          payment_id?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          review_deadline?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          time_to_hire?: number | null
          total_amount?: number | null
          updated_at?: string
          worker_id: string
        }
        Update: {
          actual_end_time?: string | null
          actual_hours?: number | null
          actual_start_time?: string | null
          application_id?: string | null
          business_id?: string
          cancellation_note?: string | null
          cancellation_reason_id?: string | null
          cancelled_at?: string | null
          check_in_at?: string | null
          check_in_lat?: number | null
          check_in_lng?: number | null
          check_out_at?: string | null
          check_out_lat?: number | null
          check_out_lng?: number | null
          checkout_time?: string | null
          created_at?: string
          end_date?: string | null
          final_price?: number | null
          id?: string
          interview_duration?: number | null
          interview_status?: string | null
          job_id?: string
          matching_score?: number | null
          payment_id?: string | null
          payment_status?: Database["public"]["Enums"]["payment_status"] | null
          review_deadline?: string | null
          start_date?: string | null
          status?: Database["public"]["Enums"]["booking_status"]
          time_to_hire?: number | null
          total_amount?: number | null
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bookings_application_id_fkey"
            columns: ["application_id"]
            isOneToOne: false
            referencedRelation: "job_applications"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_cancellation_reason_id_fkey"
            columns: ["cancellation_reason_id"]
            isOneToOne: false
            referencedRelation: "cancellation_reasons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bookings_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      business_social_connections: {
        Row: {
          access_token: string
          auto_post_enabled: boolean | null
          business_id: string
          created_at: string
          id: string
          is_default: boolean | null
          last_posted_at: string | null
          last_validated_at: string | null
          metadata: Json | null
          platform_account_id: string | null
          platform_account_name: string | null
          platform_account_url: string | null
          platform_id: string
          refresh_token: string | null
          status: Database["public"]["Enums"]["connection_status"]
          token_expires_at: string | null
          updated_at: string
          validation_errors: Json | null
          webhook_enabled: boolean | null
          webhook_secret: string | null
          webhook_url: string | null
        }
        Insert: {
          access_token: string
          auto_post_enabled?: boolean | null
          business_id: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          last_posted_at?: string | null
          last_validated_at?: string | null
          metadata?: Json | null
          platform_account_id?: string | null
          platform_account_name?: string | null
          platform_account_url?: string | null
          platform_id: string
          refresh_token?: string | null
          status?: Database["public"]["Enums"]["connection_status"]
          token_expires_at?: string | null
          updated_at?: string
          validation_errors?: Json | null
          webhook_enabled?: boolean | null
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Update: {
          access_token?: string
          auto_post_enabled?: boolean | null
          business_id?: string
          created_at?: string
          id?: string
          is_default?: boolean | null
          last_posted_at?: string | null
          last_validated_at?: string | null
          metadata?: Json | null
          platform_account_id?: string | null
          platform_account_name?: string | null
          platform_account_url?: string | null
          platform_id?: string
          refresh_token?: string | null
          status?: Database["public"]["Enums"]["connection_status"]
          token_expires_at?: string | null
          updated_at?: string
          validation_errors?: Json | null
          webhook_enabled?: boolean | null
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "business_social_connections_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "business_social_connections_platform_id_fkey"
            columns: ["platform_id"]
            isOneToOne: false
            referencedRelation: "social_platforms"
            referencedColumns: ["id"]
          },
        ]
      }
      businesses: {
        Row: {
          address: string | null
          area: string | null
          avatar_url: string | null
          business_license_url: string | null
          business_type: string | null
          created_at: string
          description: string | null
          email: string | null
          id: string
          is_verified: boolean
          lat: number | null
          lng: number | null
          name: string
          phone: string | null
          updated_at: string
          user_id: string
          verification_status: string | null
          website: string | null
        }
        Insert: {
          address?: string | null
          area?: string | null
          avatar_url?: string | null
          business_license_url?: string | null
          business_type?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_verified?: boolean
          lat?: number | null
          lng?: number | null
          name: string
          phone?: string | null
          updated_at?: string
          user_id: string
          verification_status?: string | null
          website?: string | null
        }
        Update: {
          address?: string | null
          area?: string | null
          avatar_url?: string | null
          business_license_url?: string | null
          business_type?: string | null
          created_at?: string
          description?: string | null
          email?: string | null
          id?: string
          is_verified?: boolean
          lat?: number | null
          lng?: number | null
          name?: string
          phone?: string | null
          updated_at?: string
          user_id?: string
          verification_status?: string | null
          website?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "businesses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      cancellation_reasons: {
        Row: {
          category: Database["public"]["Enums"]["cancellation_reason_category"]
          created_at: string
          description: string | null
          id: string
          is_active: boolean
          name: string
          penalty_percentage: number
          requires_verification: boolean
          sort_order: number
          updated_at: string
        }
        Insert: {
          category: Database["public"]["Enums"]["cancellation_reason_category"]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name: string
          penalty_percentage?: number
          requires_verification?: boolean
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["cancellation_reason_category"]
          created_at?: string
          description?: string | null
          id?: string
          is_active?: boolean
          name?: string
          penalty_percentage?: number
          requires_verification?: boolean
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      compliance_tracking: {
        Row: {
          business_id: string
          created_at: string
          days_worked: number
          id: string
          month: string
          updated_at: string
          worker_id: string
        }
        Insert: {
          business_id: string
          created_at?: string
          days_worked?: number
          id?: string
          month: string
          updated_at?: string
          worker_id: string
        }
        Update: {
          business_id?: string
          created_at?: string
          days_worked?: number
          id?: string
          month?: string
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_tracking_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_tracking_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_warnings: {
        Row: {
          acknowledged: boolean
          business_id: string
          created_at: string
          days_worked: number
          id: string
          month: string
          updated_at: string
          warning_level: string
          worker_id: string
        }
        Insert: {
          acknowledged?: boolean
          business_id: string
          created_at?: string
          days_worked?: number
          id?: string
          month: string
          updated_at?: string
          warning_level?: string
          worker_id: string
        }
        Update: {
          acknowledged?: boolean
          business_id?: string
          created_at?: string
          days_worked?: number
          id?: string
          month?: string
          updated_at?: string
          warning_level?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "compliance_warnings_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_warnings_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          admin_notes: string | null
          booking_id: string
          created_at: string
          evidence_urls: string[] | null
          id: string
          raised_by: string
          reason: string
          resolution: string | null
          resolved_at: string | null
          status: Database["public"]["Enums"]["dispute_status"]
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          booking_id: string
          created_at?: string
          evidence_urls?: string[] | null
          id?: string
          raised_by: string
          reason: string
          resolution?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          booking_id?: string
          created_at?: string
          evidence_urls?: string[] | null
          id?: string
          raised_by?: string
          reason?: string
          resolution?: string | null
          resolved_at?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_raised_by_fkey"
            columns: ["raised_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      interview_sessions: {
        Row: {
          booking_id: string
          business_id: string
          chat_completed_at: string | null
          chat_duration: number | null
          chat_started_at: string | null
          completed_at: string | null
          created_at: string
          id: string
          messages_sent: number
          started_at: string | null
          status: string
          time_to_hire: number | null
          total_duration: number | null
          type: string
          voice_call_initiated: boolean
          voice_completed_at: string | null
          voice_duration: number | null
          voice_started_at: string | null
          worker_id: string
          worker_tier: Database["public"]["Enums"]["worker_tier"]
        }
        Insert: {
          booking_id: string
          business_id: string
          chat_completed_at?: string | null
          chat_duration?: number | null
          chat_started_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          messages_sent?: number
          started_at?: string | null
          status?: string
          time_to_hire?: number | null
          total_duration?: number | null
          type?: string
          voice_call_initiated?: boolean
          voice_completed_at?: string | null
          voice_duration?: number | null
          voice_started_at?: string | null
          worker_id: string
          worker_tier: Database["public"]["Enums"]["worker_tier"]
        }
        Update: {
          booking_id?: string
          business_id?: string
          chat_completed_at?: string | null
          chat_duration?: number | null
          chat_started_at?: string | null
          completed_at?: string | null
          created_at?: string
          id?: string
          messages_sent?: number
          started_at?: string | null
          status?: string
          time_to_hire?: number | null
          total_duration?: number | null
          type?: string
          voice_call_initiated?: boolean
          voice_completed_at?: string | null
          voice_duration?: number | null
          voice_started_at?: string | null
          worker_id?: string
          worker_tier?: Database["public"]["Enums"]["worker_tier"]
        }
        Relationships: [
          {
            foreignKeyName: "interview_sessions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: true
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_sessions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interview_sessions_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      job_applications: {
        Row: {
          applied_at: string
          availability_json: Json | null
          business_id: string
          cover_letter: string | null
          created_at: string
          id: string
          job_id: string
          proposed_wage: number | null
          responded_at: string | null
          reviewed_at: string | null
          status: string
          updated_at: string
          worker_id: string
        }
        Insert: {
          applied_at?: string
          availability_json?: Json | null
          business_id: string
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_id: string
          proposed_wage?: number | null
          responded_at?: string | null
          reviewed_at?: string | null
          status?: string
          updated_at?: string
          worker_id: string
        }
        Update: {
          applied_at?: string
          availability_json?: Json | null
          business_id?: string
          cover_letter?: string | null
          created_at?: string
          id?: string
          job_id?: string
          proposed_wage?: number | null
          responded_at?: string | null
          reviewed_at?: string | null
          status?: string
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_applications_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_applications_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      job_posts: {
        Row: {
          connection_id: string
          content: Json | null
          created_at: string
          error_code: string | null
          error_message: string | null
          id: string
          job_id: string
          last_retry_at: string | null
          media_ids: string[] | null
          metrics: Json | null
          platform_post_id: string | null
          platform_post_url: string | null
          post_type: string | null
          posted_at: string | null
          retry_count: number | null
          scheduled_at: string | null
          status: Database["public"]["Enums"]["job_post_status"]
          updated_at: string
        }
        Insert: {
          connection_id: string
          content?: Json | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          job_id: string
          last_retry_at?: string | null
          media_ids?: string[] | null
          metrics?: Json | null
          platform_post_id?: string | null
          platform_post_url?: string | null
          post_type?: string | null
          posted_at?: string | null
          retry_count?: number | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["job_post_status"]
          updated_at?: string
        }
        Update: {
          connection_id?: string
          content?: Json | null
          created_at?: string
          error_code?: string | null
          error_message?: string | null
          id?: string
          job_id?: string
          last_retry_at?: string | null
          media_ids?: string[] | null
          metrics?: Json | null
          platform_post_id?: string | null
          platform_post_url?: string | null
          post_type?: string | null
          posted_at?: string | null
          retry_count?: number | null
          scheduled_at?: string | null
          status?: Database["public"]["Enums"]["job_post_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "job_posts_connection_id_fkey"
            columns: ["connection_id"]
            isOneToOne: false
            referencedRelation: "business_social_connections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "job_posts_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs: {
        Row: {
          address: string | null
          budget_max: number
          budget_min: number
          business_id: string
          category_id: string
          created_at: string
          deadline: string | null
          description: string | null
          hours_needed: number
          id: string
          is_urgent: boolean
          lat: number | null
          lng: number | null
          overtime_multiplier: number
          qr_code: string | null
          qr_generated_at: string | null
          requirements: string | null
          status: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          budget_max?: number
          budget_min?: number
          business_id: string
          category_id: string
          created_at?: string
          deadline?: string | null
          description?: string | null
          hours_needed?: number
          id?: string
          is_urgent?: boolean
          lat?: number | null
          lng?: number | null
          overtime_multiplier?: number
          qr_code?: string | null
          qr_generated_at?: string | null
          requirements?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          title: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          budget_max?: number
          budget_min?: number
          business_id?: string
          category_id?: string
          created_at?: string
          deadline?: string | null
          description?: string | null
          hours_needed?: number
          id?: string
          is_urgent?: boolean
          lat?: number | null
          lng?: number | null
          overtime_multiplier?: number
          qr_code?: string | null
          qr_generated_at?: string | null
          requirements?: string | null
          status?: Database["public"]["Enums"]["job_status"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      jobs_skills: {
        Row: {
          job_id: string
          skill_id: string
        }
        Insert: {
          job_id: string
          skill_id: string
        }
        Update: {
          job_id?: string
          skill_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "jobs_skills_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "jobs_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
        ]
      }
      kyc_verifications: {
        Row: {
          created_at: string
          id: string
          ktp_extracted_data: Json | null
          ktp_image_url: string | null
          ktp_number: string
          rejection_reason: string | null
          selfie_image_url: string | null
          status: string
          submitted_at: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
          worker_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          ktp_extracted_data?: Json | null
          ktp_image_url?: string | null
          ktp_number: string
          rejection_reason?: string | null
          selfie_image_url?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          worker_id: string
        }
        Update: {
          created_at?: string
          id?: string
          ktp_extracted_data?: Json | null
          ktp_image_url?: string | null
          ktp_number?: string
          rejection_reason?: string | null
          selfie_image_url?: string | null
          status?: string
          submitted_at?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "kyc_verifications_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kyc_verifications_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          booking_id: string | null
          content: string
          created_at: string
          id: string
          is_read: boolean
          receiver_id: string
          sender_id: string
        }
        Insert: {
          booking_id?: string | null
          content: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id: string
          sender_id: string
        }
        Update: {
          booking_id?: string | null
          content?: string
          created_at?: string
          id?: string
          is_read?: boolean
          receiver_id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_receiver_id_fkey"
            columns: ["receiver_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          title: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          booking_id: string | null
          business_id: string | null
          created_at: string
          fee_amount: number | null
          id: string
          metadata: Json | null
          paid_at: string | null
          payment_method: string | null
          payment_provider: string
          payment_url: string | null
          provider_payment_id: string | null
          provider_transaction_id: string | null
          qris_expires_at: string | null
          status: Database["public"]["Enums"]["payment_status"]
          updated_at: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          business_id?: string | null
          created_at?: string
          fee_amount?: number | null
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          payment_method?: string | null
          payment_provider?: string
          payment_url?: string | null
          provider_payment_id?: string | null
          provider_transaction_id?: string | null
          qris_expires_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          business_id?: string | null
          created_at?: string
          fee_amount?: number | null
          id?: string
          metadata?: Json | null
          paid_at?: string | null
          payment_method?: string | null
          payment_provider?: string
          payment_url?: string | null
          provider_payment_id?: string | null
          provider_transaction_id?: string | null
          qris_expires_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
        ]
      }
      reliability_score_history: {
        Row: {
          booking_id: string | null
          change_reason: string | null
          created_at: string
          id: string
          new_score: number | null
          previous_score: number | null
          worker_id: string
        }
        Insert: {
          booking_id?: string | null
          change_reason?: string | null
          created_at?: string
          id?: string
          new_score?: number | null
          previous_score?: number | null
          worker_id: string
        }
        Update: {
          booking_id?: string | null
          change_reason?: string | null
          created_at?: string
          id?: string
          new_score?: number | null
          previous_score?: number | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reliability_score_history_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reliability_score_history_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      reports: {
        Row: {
          created_at: string
          id: string
          reason: string
          reported_id: string
          reported_type: Database["public"]["Enums"]["report_type"]
          reporter_id: string
          status: Database["public"]["Enums"]["report_status"]
        }
        Insert: {
          created_at?: string
          id?: string
          reason: string
          reported_id: string
          reported_type: Database["public"]["Enums"]["report_type"]
          reporter_id: string
          status?: Database["public"]["Enums"]["report_status"]
        }
        Update: {
          created_at?: string
          id?: string
          reason?: string
          reported_id?: string
          reported_type?: Database["public"]["Enums"]["report_type"]
          reporter_id?: string
          status?: Database["public"]["Enums"]["report_status"]
        }
        Relationships: [
          {
            foreignKeyName: "reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          booking_id: string
          business_id: string | null
          comment: string | null
          created_at: string
          id: string
          rating: number
          reviewer: Database["public"]["Enums"]["reviewer_type"]
          worker_id: string
          would_rehire: boolean | null
        }
        Insert: {
          booking_id: string
          business_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          rating: number
          reviewer?: Database["public"]["Enums"]["reviewer_type"]
          worker_id: string
          would_rehire?: boolean | null
        }
        Update: {
          booking_id?: string
          business_id?: string | null
          comment?: string | null
          created_at?: string
          id?: string
          rating?: number
          reviewer?: Database["public"]["Enums"]["reviewer_type"]
          worker_id?: string
          would_rehire?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "reviews_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_business_id_fkey"
            columns: ["business_id"]
            isOneToOne: false
            referencedRelation: "businesses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      saved_searches: {
        Row: {
          created_at: string
          filters: Json
          id: string
          is_favorite: boolean
          name: string
          updated_at: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          filters?: Json
          id?: string
          is_favorite?: boolean
          name: string
          updated_at?: string
          worker_id: string
        }
        Update: {
          created_at?: string
          filters?: Json
          id?: string
          is_favorite?: boolean
          name?: string
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "saved_searches_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      skills: {
        Row: {
          created_at: string
          id: string
          name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      social_platforms: {
        Row: {
          api_version: string | null
          auth_type: string
          config: Json | null
          created_at: string
          description: string | null
          id: string
          is_available: boolean
          platform_name: string
          platform_type: Database["public"]["Enums"]["social_platform_type"]
          status: Database["public"]["Enums"]["social_platform_status"]
          updated_at: string
          webhook_secret: string | null
          webhook_url: string | null
        }
        Insert: {
          api_version?: string | null
          auth_type?: string
          config?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_available?: boolean
          platform_name: string
          platform_type: Database["public"]["Enums"]["social_platform_type"]
          status?: Database["public"]["Enums"]["social_platform_status"]
          updated_at?: string
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Update: {
          api_version?: string | null
          auth_type?: string
          config?: Json | null
          created_at?: string
          description?: string | null
          id?: string
          is_available?: boolean
          platform_name?: string
          platform_type?: Database["public"]["Enums"]["social_platform_type"]
          status?: Database["public"]["Enums"]["social_platform_status"]
          updated_at?: string
          webhook_secret?: string | null
          webhook_url?: string | null
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          booking_id: string
          created_at: string
          id: string
          provider_transaction_id: string | null
          status: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Insert: {
          amount: number
          booking_id: string
          created_at?: string
          id?: string
          provider_transaction_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type: Database["public"]["Enums"]["transaction_type"]
        }
        Update: {
          amount?: number
          booking_id?: string
          created_at?: string
          id?: string
          provider_transaction_id?: string | null
          status?: Database["public"]["Enums"]["transaction_status"]
          type?: Database["public"]["Enums"]["transaction_type"]
        }
        Relationships: [
          {
            foreignKeyName: "transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string
          id: string
          language_preference: string
          phone: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string
          id?: string
          language_preference?: string
          phone?: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          language_preference?: string
          phone?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          booking_id: string | null
          created_at: string
          description: string | null
          id: string
          metadata: Json | null
          status: Database["public"]["Enums"]["payment_status"]
          type: Database["public"]["Enums"]["wallet_transaction_type"]
          wallet_id: string
        }
        Insert: {
          amount: number
          booking_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          status?: Database["public"]["Enums"]["payment_status"]
          type: Database["public"]["Enums"]["wallet_transaction_type"]
          wallet_id: string
        }
        Update: {
          amount?: number
          booking_id?: string | null
          created_at?: string
          description?: string | null
          id?: string
          metadata?: Json | null
          status?: Database["public"]["Enums"]["payment_status"]
          type?: Database["public"]["Enums"]["wallet_transaction_type"]
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_booking_id_fkey"
            columns: ["booking_id"]
            isOneToOne: false
            referencedRelation: "bookings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "wallets"
            referencedColumns: ["id"]
          },
        ]
      }
      wallets: {
        Row: {
          available_balance: number
          balance: number
          created_at: string
          id: string
          pending_balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          available_balance?: number
          balance?: number
          created_at?: string
          id?: string
          pending_balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          available_balance?: number
          balance?: number
          created_at?: string
          id?: string
          pending_balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallets_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      webhooks: {
        Row: {
          created_at: string
          events: string[]
          id: string
          is_active: boolean
          secret: string
          url: string
        }
        Insert: {
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          secret: string
          url: string
        }
        Update: {
          created_at?: string
          events?: string[]
          id?: string
          is_active?: boolean
          secret?: string
          url?: string
        }
        Relationships: []
      }
      worker_achievements: {
        Row: {
          achievement_type: string
          awarded_at: string
          description: string | null
          id: string
          title: string
          worker_id: string | null
        }
        Insert: {
          achievement_type: string
          awarded_at?: string
          description?: string | null
          id?: string
          title: string
          worker_id?: string | null
        }
        Update: {
          achievement_type?: string
          awarded_at?: string
          description?: string | null
          id?: string
          title?: string
          worker_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "worker_achievements_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_availabilities: {
        Row: {
          created_at: string
          day_of_week: number
          end_hour: number
          id: string
          is_available: boolean
          start_hour: number
          updated_at: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          day_of_week: number
          end_hour: number
          id?: string
          is_available?: boolean
          start_hour: number
          updated_at?: string
          worker_id: string
        }
        Update: {
          created_at?: string
          day_of_week?: number
          end_hour?: number
          id?: string
          is_available?: boolean
          start_hour?: number
          updated_at?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_availabilities_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_badges: {
        Row: {
          badge_id: string
          created_at: string
          earned_at: string
          id: string
          progress: Json | null
          verification_status: string | null
          verified_at: string | null
          worker_id: string
        }
        Insert: {
          badge_id: string
          created_at?: string
          earned_at?: string
          id?: string
          progress?: Json | null
          verification_status?: string | null
          verified_at?: string | null
          worker_id: string
        }
        Update: {
          badge_id?: string
          created_at?: string
          earned_at?: string
          id?: string
          progress?: Json | null
          verification_status?: string | null
          verified_at?: string | null
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_badges_badge_id_fkey"
            columns: ["badge_id"]
            isOneToOne: false
            referencedRelation: "badges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_badges_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      worker_skills: {
        Row: {
          created_at: string
          skill_id: string
          worker_id: string
        }
        Insert: {
          created_at?: string
          skill_id: string
          worker_id: string
        }
        Update: {
          created_at?: string
          skill_id?: string
          worker_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "worker_skills_skill_id_fkey"
            columns: ["skill_id"]
            isOneToOne: false
            referencedRelation: "skills"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "worker_skills_worker_id_fkey"
            columns: ["worker_id"]
            isOneToOne: false
            referencedRelation: "workers"
            referencedColumns: ["id"]
          },
        ]
      }
      workers: {
        Row: {
          address: string | null
          area: string | null
          avatar_url: string | null
          bio: string | null
          created_at: string
          dob: string | null
          experience_years: number | null
          full_name: string
          gender: string | null
          id: string
          jobs_completed: number
          kyc_status: string
          lat: number | null
          lng: number | null
          location_name: string | null
          phone: string | null
          punctuality: number | null
          rating: number | null
          reliability_score: number
          tier: Database["public"]["Enums"]["worker_tier"]
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          area?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          dob?: string | null
          experience_years?: number | null
          full_name: string
          gender?: string | null
          id?: string
          jobs_completed?: number
          kyc_status?: string
          lat?: number | null
          lng?: number | null
          location_name?: string | null
          phone?: string | null
          punctuality?: number | null
          rating?: number | null
          reliability_score?: number
          tier?: Database["public"]["Enums"]["worker_tier"]
          updated_at?: string
          user_id: string
        }
        Update: {
          address?: string | null
          area?: string | null
          avatar_url?: string | null
          bio?: string | null
          created_at?: string
          dob?: string | null
          experience_years?: number | null
          full_name?: string
          gender?: string | null
          id?: string
          jobs_completed?: number
          kyc_status?: string
          lat?: number | null
          lng?: number | null
          location_name?: string | null
          phone?: string | null
          punctuality?: number | null
          rating?: number | null
          reliability_score?: number
          tier?: Database["public"]["Enums"]["worker_tier"]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workers_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      award_badge: {
        Args: { p_badge_id: string; p_progress?: Json; p_worker_id: string }
        Returns: string
      }
      calculate_availability_score: {
        Args: {
          p_day_of_week: number
          p_job_end_hour: number
          p_job_start_hour: number
          p_worker_id: string
        }
        Returns: number
      }
      calculate_days_worked: {
        Args: { p_business_id: string; p_month: string; p_worker_id: string }
        Returns: number
      }
      calculate_reliability_score: {
        Args: { p_worker_id: string }
        Returns: number
      }
      check_badge_eligibility: {
        Args: { p_badge_id: string; p_worker_id: string }
        Returns: boolean
      }
      check_worker_availability: {
        Args: {
          p_day_of_week: number
          p_job_end_hour: number
          p_job_start_hour: number
          p_worker_id: string
        }
        Returns: boolean
      }
      create_business_social_connection: {
        Args: {
          access_token_val: string
          account_name_val: string
          business_uuid: string
          platform_uuid: string
          refresh_token_val?: string
          token_expires_val?: string
        }
        Returns: string
      }
      create_job_post: {
        Args: {
          connection_uuid: string
          job_uuid: string
          post_content?: Json
          post_type_val?: string
        }
        Returns: string
      }
      disconnect_social_connection: {
        Args: { connection_uuid: string }
        Returns: boolean
      }
      ensure_wallet_exists: { Args: { user_uuid: string }; Returns: string }
      get_business_active_connections: {
        Args: { business_uuid: string }
        Returns: {
          auto_post_enabled: boolean
          id: string
          is_default: boolean
          platform_account_name: string
          platform_name: string
          platform_type: Database["public"]["Enums"]["social_platform_type"]
        }[]
      }
      get_expiring_token_connections: {
        Args: never
        Returns: {
          business_id: string
          id: string
          platform_type: Database["public"]["Enums"]["social_platform_type"]
          token_expires_at: string
        }[]
      }
      get_job_distribution_status: {
        Args: { job_uuid: string }
        Returns: {
          error_message: string
          platform_name: string
          platform_type: Database["public"]["Enums"]["social_platform_type"]
          posted_at: string
          scheduled_at: string
          status: Database["public"]["Enums"]["job_post_status"]
        }[]
      }
      get_job_posts_with_platform: {
        Args: { job_uuid: string }
        Returns: {
          error_message: string
          id: string
          metrics: Json
          platform_name: string
          platform_post_id: string
          platform_post_url: string
          platform_type: Database["public"]["Enums"]["social_platform_type"]
          posted_at: string
          status: Database["public"]["Enums"]["job_post_status"]
        }[]
      }
      get_pending_job_posts: {
        Args: never
        Returns: {
          connection_id: string
          id: string
          job_id: string
          platform_type: Database["public"]["Enums"]["social_platform_type"]
          scheduled_at: string
        }[]
      }
      get_platform_config: {
        Args: { platform: Database["public"]["Enums"]["social_platform_type"] }
        Returns: Json
      }
      get_user_avatar_path: {
        Args: { filename?: string; user_id: string }
        Returns: string
      }
      get_user_document_path: {
        Args: { filename: string; user_id: string }
        Returns: string
      }
      get_user_image_path: {
        Args: { filename: string; user_id: string }
        Returns: string
      }
      get_user_role: { Args: { user_id: string }; Returns: string }
      increment_interview_messages: {
        Args: { session_id: string }
        Returns: undefined
      }
      increment_job_post_metric: {
        Args: { metric_name: string; metric_value?: number; post_uuid: string }
        Returns: boolean
      }
      is_admin: { Args: never; Returns: boolean }
      is_business_owner: { Args: { business_id: string }; Returns: boolean }
      is_platform_available: {
        Args: { platform: Database["public"]["Enums"]["social_platform_type"] }
        Returns: boolean
      }
      is_wallet_owner: { Args: { wallet_id: string }; Returns: boolean }
      is_worker_owner: { Args: { worker_id: string }; Returns: boolean }
      manually_distribute_job: { Args: { job_uuid: string }; Returns: number }
      mark_job_post_failed: {
        Args: { error_cd?: string; error_msg?: string; post_uuid: string }
        Returns: boolean
      }
      mark_job_post_posted: {
        Args: {
          platform_post_id_val: string
          platform_post_url_val?: string
          post_uuid: string
        }
        Returns: boolean
      }
      retry_job_post: { Args: { post_uuid: string }; Returns: boolean }
      set_default_connection: {
        Args: { connection_uuid: string }
        Returns: boolean
      }
      update_connection_tokens: {
        Args: {
          access_token_val: string
          connection_uuid: string
          refresh_token_val?: string
          token_expires_val?: string
        }
        Returns: boolean
      }
      update_job_post_metrics: {
        Args: { metrics_data: Json; post_uuid: string }
        Returns: boolean
      }
    }
    Enums: {
      badge_category: "skill" | "training" | "certification" | "specialization"
      badge_type: "tier" | "achievement" | "skill"
      bank_code: "BCA" | "BRI" | "Mandiri" | "BNI"
      booking_status:
        | "pending"
        | "accepted"
        | "rejected"
        | "in_progress"
        | "completed"
        | "cancelled"
        | "no_show"
      cancellation_reason_category:
        | "illness"
        | "family_emergency"
        | "personal_emergency"
        | "weather"
        | "transportation"
        | "schedule_conflict"
        | "other"
      connection_status: "active" | "disconnected" | "expired" | "pending"
      dispute_status: "pending" | "investigating" | "resolved" | "rejected"
      job_post_status: "pending" | "posted" | "failed" | "deleted"
      job_status: "open" | "in_progress" | "completed" | "cancelled"
      payment_status:
        | "pending_review"
        | "available"
        | "released"
        | "disputed"
        | "cancelled"
        | "paid"
        | "failed"
      report_status: "pending" | "reviewing" | "resolved" | "dismissed"
      report_type: "user" | "job" | "business" | "booking"
      reviewer_type: "business" | "worker"
      social_platform_status: "active" | "inactive" | "maintenance"
      social_platform_type: "instagram" | "facebook" | "twitter" | "linkedin"
      tier_requirement: "classic" | "pro" | "elite" | "champion"
      transaction_status: "pending" | "success" | "failed"
      transaction_type: "payment" | "refund"
      user_role: "worker" | "business" | "admin"
      wallet_transaction_type:
        | "earn"
        | "payout"
        | "refund"
        | "hold"
        | "release"
        | "debit"
        | "credit"
      worker_tier: "classic" | "pro" | "elite" | "champion"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}
type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">
type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]
export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never
export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never
export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never
export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never
export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      badge_category: ["skill", "training", "certification", "specialization"],
      badge_type: ["tier", "achievement", "skill"],
      bank_code: ["BCA", "BRI", "Mandiri", "BNI"],
      booking_status: [
        "pending",
        "accepted",
        "rejected",
        "in_progress",
        "completed",
        "cancelled",
        "no_show",
      ],
      cancellation_reason_category: [
        "illness",
        "family_emergency",
        "personal_emergency",
        "weather",
        "transportation",
        "schedule_conflict",
        "other",
      ],
      connection_status: ["active", "disconnected", "expired", "pending"],
      dispute_status: ["pending", "investigating", "resolved", "rejected"],
      job_post_status: ["pending", "posted", "failed", "deleted"],
      job_status: ["open", "in_progress", "completed", "cancelled"],
      payment_status: [
        "pending_review",
        "available",
        "released",
        "disputed",
        "cancelled",
        "paid",
        "failed",
      ],
      report_status: ["pending", "reviewing", "resolved", "dismissed"],
      report_type: ["user", "job", "business", "booking"],
      reviewer_type: ["business", "worker"],
      social_platform_status: ["active", "inactive", "maintenance"],
      social_platform_type: ["instagram", "facebook", "twitter", "linkedin"],
      tier_requirement: ["classic", "pro", "elite", "champion"],
      transaction_status: ["pending", "success", "failed"],
      transaction_type: ["payment", "refund"],
      user_role: ["worker", "business", "admin"],
      wallet_transaction_type: [
        "earn",
        "payout",
        "refund",
        "hold",
        "release",
        "debit",
        "credit",
      ],
      worker_tier: ["classic", "pro", "elite", "champion"],
    },
  },
} as const
