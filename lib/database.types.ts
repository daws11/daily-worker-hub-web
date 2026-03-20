export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  graphql_public: {
    Tables: {
      [_ in never]: never;
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      graphql: {
        Args: {
          extensions?: Json;
          operationName?: string;
          query?: string;
          variables?: Json;
        };
        Returns: Json;
      };
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
  public: {
    Tables: {
      workers: {
        Row: {
          id: string;
          user_id: string;
          created_at: string;
          updated_at: string;
          phone: string | null;
          address: string | null;
          skills: string[] | null;
          experience_years: number | null;
          hourly_rate: number | null;
          availability: Json | null;
          rating: number | null;
          total_jobs: number;
          completed_jobs: number;
          cancelled_jobs: number;
          response_time_hours: number | null;
          is_verified: boolean;
          is_available: boolean;
        };
        Insert: {
          id?: string;
          user_id: string;
          created_at?: string;
          updated_at?: string;
          phone?: string | null;
          address?: string | null;
          skills?: string[] | null;
          experience_years?: number | null;
          hourly_rate?: number | null;
          availability?: Json | null;
          rating?: number | null;
          total_jobs?: number;
          completed_jobs?: number;
          cancelled_jobs?: number;
          response_time_hours?: number | null;
          is_verified?: boolean;
          is_available?: boolean;
        };
        Update: {
          id?: string;
          user_id?: string;
          created_at?: string;
          updated_at?: string;
          phone?: string | null;
          address?: string | null;
          skills?: string[] | null;
          experience_years?: number | null;
          hourly_rate?: number | null;
          availability?: Json | null;
          rating?: number | null;
          total_jobs?: number;
          completed_jobs?: number;
          cancelled_jobs?: number;
          response_time_hours?: number | null;
          is_verified?: boolean;
          is_available?: boolean;
        };
        Relationships: [];
      };
      businesses: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string | null;
          email: string;
          phone: string;
          address: string;
          lat: number;
          lng: number;
          website: string | null;
          is_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name: string;
          description?: string | null;
          email: string;
          phone: string;
          address: string;
          lat?: number;
          lng?: number;
          website?: string | null;
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string;
          description?: string | null;
          email?: string;
          phone?: string;
          address?: string;
          lat?: number;
          lng?: number;
          website?: string | null;
          is_verified?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      jobs: {
        Row: {
          id: string;
          business_id: string;
          category_id: string | null;
          title: string;
          description: string;
          requirements: string | null;
          budget_min: number;
          budget_max: number;
          hours_needed: number;
          address: string;
          lat: number | null;
          lng: number | null;
          deadline: string | null;
          is_urgent: boolean;
          overtime_multiplier: number | null;
          workers_needed: number;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          business_id: string;
          category_id?: string | null;
          title: string;
          description: string;
          requirements?: string | null;
          budget_min: number;
          budget_max: number;
          hours_needed: number;
          address: string;
          lat?: number | null;
          lng?: number | null;
          deadline?: string | null;
          is_urgent?: boolean;
          overtime_multiplier?: number | null;
          workers_needed?: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          business_id?: string;
          category_id?: string | null;
          title?: string;
          description?: string;
          requirements?: string | null;
          budget_min?: number;
          budget_max?: number;
          hours_needed?: number;
          address?: string;
          lat?: number | null;
          lng?: number | null;
          deadline?: string | null;
          is_urgent?: boolean;
          overtime_multiplier?: number | null;
          workers_needed?: number;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      bookings: {
        Row: {
          id: string;
          job_id: string;
          worker_id: string;
          business_id: string;
          status: string;
          scheduled_date: string;
          scheduled_end_time: string | null;
          check_in_at: string | null;
          check_out_at: string | null;
          hourly_rate: number;
          hours_worked: number | null;
          actual_hours: number | null;
          total_amount: number | null;
          notes: string | null;
          special_instructions: string | null;
          cancellation_reason_id: string | null;
          cancellation_note: string | null;
          cancelled_at: string | null;
          completion_notes: string | null;
          created_at: string;
          updated_at: string;
          start_date: string | null;
        };
        Insert: {
          id?: string;
          job_id: string;
          worker_id: string;
          business_id: string;
          status?: string;
          scheduled_date: string;
          scheduled_end_time?: string | null;
          check_in_at?: string | null;
          check_out_at?: string | null;
          hourly_rate: number;
          hours_worked?: number | null;
          actual_hours?: number | null;
          total_amount?: number | null;
          notes?: string | null;
          special_instructions?: string | null;
          cancellation_reason_id?: string | null;
          cancellation_note?: string | null;
          cancelled_at?: string | null;
          completion_notes?: string | null;
          created_at?: string;
          updated_at?: string;
          start_date?: string | null;
        };
        Update: {
          id?: string;
          job_id?: string;
          worker_id?: string;
          business_id?: string;
          status?: string;
          scheduled_date?: string;
          scheduled_end_time?: string | null;
          check_in_at?: string | null;
          check_out_at?: string | null;
          hourly_rate?: number;
          hours_worked?: number | null;
          actual_hours?: number | null;
          total_amount?: number | null;
          notes?: string | null;
          special_instructions?: string | null;
          cancellation_reason_id?: string | null;
          cancellation_note?: string | null;
          cancelled_at?: string | null;
          completion_notes?: string | null;
          created_at?: string;
          updated_at?: string;
          start_date?: string | null;
        };
        Relationships: [];
      };
      applications: {
        Row: {
          id: string;
          job_id: string;
          worker_id: string;
          status: string;
          message: string | null;
          proposed_rate: number | null;
          availability_date: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          job_id: string;
          worker_id: string;
          status?: string;
          message?: string | null;
          proposed_rate?: number | null;
          availability_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          job_id?: string;
          worker_id?: string;
          status?: string;
          message?: string | null;
          proposed_rate?: number | null;
          availability_date?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      reviews: {
        Row: {
          id: string;
          booking_id: string;
          reviewer_id: string;
          reviewee_id: string;
          worker_id: string | null;
          business_id: string | null;
          rating: number;
          comment: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          booking_id: string;
          reviewer_id: string;
          reviewee_id: string;
          worker_id?: string | null;
          business_id?: string | null;
          rating: number;
          comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          booking_id?: string;
          reviewer_id?: string;
          reviewee_id?: string;
          worker_id?: string | null;
          business_id?: string | null;
          rating?: number;
          comment?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          recipient_id: string;
          content: string;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          sender_id: string;
          recipient_id: string;
          content: string;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          sender_id?: string;
          recipient_id?: string;
          content?: string;
          read_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          data: Json | null;
          is_read: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: string;
          title: string;
          message: string;
          data?: Json | null;
          is_read?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: string;
          title?: string;
          message?: string;
          data?: Json | null;
          is_read?: boolean;
          created_at?: string;
        };
        Relationships: [];
      };
      notification_preferences: {
        Row: {
          id: string;
          user_id: string;
          push_enabled: boolean;
          booking_notifications: boolean;
          reminder_notifications: boolean;
          payment_notifications: boolean;
          message_notifications: boolean;
          review_notifications: boolean;
          quiet_hours_enabled: boolean;
          quiet_hours_start: string | null;
          quiet_hours_end: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          push_enabled?: boolean;
          booking_notifications?: boolean;
          reminder_notifications?: boolean;
          payment_notifications?: boolean;
          message_notifications?: boolean;
          review_notifications?: boolean;
          quiet_hours_enabled?: boolean;
          quiet_hours_start?: string | null;
          quiet_hours_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          push_enabled?: boolean;
          booking_notifications?: boolean;
          reminder_notifications?: boolean;
          payment_notifications?: boolean;
          message_notifications?: boolean;
          review_notifications?: boolean;
          quiet_hours_enabled?: boolean;
          quiet_hours_start?: string | null;
          quiet_hours_end?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      user_fcm_tokens: {
        Row: {
          id: string;
          user_id: string;
          token: string;
          device_type: string | null;
          is_active: boolean;
          last_used_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          token: string;
          device_type?: string | null;
          is_active?: boolean;
          last_used_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          token?: string;
          device_type?: string | null;
          is_active?: boolean;
          last_used_at?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      worker_achievements: {
        Row: {
          id: string;
          worker_id: string;
          badge_type: string;
          earned_at: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          worker_id: string;
          badge_type: string;
          earned_at: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          worker_id?: string;
          badge_type?: string;
          earned_at?: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Relationships: [];
      };
      worker_badge_progress: {
        Row: {
          id: string;
          worker_id: string;
          badge_type: string;
          current_value: number;
          target_value: number;
          last_updated: string;
        };
        Insert: {
          id?: string;
          worker_id: string;
          badge_type: string;
          current_value: number;
          target_value: number;
          last_updated?: string;
        };
        Update: {
          id?: string;
          worker_id?: string;
          badge_type?: string;
          current_value?: number;
          target_value?: number;
          last_updated?: string;
        };
        Relationships: [];
      };
      badges: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          icon: string | null;
          tier: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          icon?: string | null;
          tier?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          icon?: string | null;
          tier?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          icon: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          description?: string | null;
          icon?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          description?: string | null;
          icon?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      skills: {
        Row: {
          id: string;
          name: string;
          category_id: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          category_id?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          category_id?: string | null;
          created_at?: string;
        };
        Relationships: [];
      };
      jobs_skills: {
        Row: {
          job_id: string;
          skill_id: string;
          created_at: string;
        };
        Insert: {
          job_id: string;
          skill_id: string;
          created_at?: string;
        };
        Update: {
          job_id?: string;
          skill_id?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      cancellation_reasons: {
        Row: {
          id: string;
          reason: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          reason: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          reason?: string;
          created_at?: string;
        };
        Relationships: [];
      };
      reports: {
        Row: {
          id: string;
          reporter_id: string;
          reported_user_id: string | null;
          report_type: string;
          description: string;
          status: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          reporter_id: string;
          reported_user_id?: string | null;
          report_type: string;
          description: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          reporter_id?: string;
          reported_user_id?: string | null;
          report_type?: string;
          description?: string;
          status?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
      admin_users: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          role: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          email: string;
          full_name?: string | null;
          role: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          role?: string;
          created_at?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
};

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">;

type DefaultSchema = DatabaseWithoutInternals[Extract<
  keyof Database,
  "public"
>];

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R;
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R;
      }
      ? R
      : never
    : never;

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I;
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I;
      }
      ? I
      : never
    : never;

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U;
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U;
      }
      ? U
      : never
    : never;

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never;

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals;
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals;
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never;

export const Constants = {
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {},
  },
} as const;
