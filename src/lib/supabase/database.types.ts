export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.4"
  }
  public: {
    Tables: {
      admin_users: {
        Row: {
          created_at: string | null
          email: string
          id: string
          is_active: boolean | null
          last_login: string | null
          name: string | null
          password_hash: string
        }
        Insert: {
          created_at?: string | null
          email: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          name?: string | null
          password_hash: string
        }
        Update: {
          created_at?: string | null
          email?: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          name?: string | null
          password_hash?: string
        }
        Relationships: []
      }
      blocked_dates: {
        Row: {
          created_at: string | null
          date_range: unknown
          id: string
          reason: string | null
          villa_id: string | null
        }
        Insert: {
          created_at?: string | null
          date_range: unknown
          id?: string
          reason?: string | null
          villa_id?: string | null
        }
        Update: {
          created_at?: string | null
          date_range?: unknown
          id?: string
          reason?: string | null
          villa_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blocked_dates_villa_id_fkey"
            columns: ["villa_id"]
            isOneToOne: false
            referencedRelation: "villas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blocked_dates_villa_id_fkey"
            columns: ["villa_id"]
            isOneToOne: false
            referencedRelation: "villas_with_owner"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          cover_image: string | null
          id: string
          name: string
          slug: string
        }
        Insert: {
          cover_image?: string | null
          id?: string
          name: string
          slug: string
        }
        Update: {
          cover_image?: string | null
          id?: string
          name?: string
          slug?: string
        }
        Relationships: []
      }
      email_logs: {
        Row: {
          clicked_at: string | null
          created_at: string | null
          email_type: string
          error_message: string | null
          external_id: string | null
          id: number
          language: string | null
          opened_at: string | null
          recipient: string
          reservation_id: string | null
          sent_at: string | null
          status: string
          token: string | null
          villa_id: string | null
        }
        Insert: {
          clicked_at?: string | null
          created_at?: string | null
          email_type: string
          error_message?: string | null
          external_id?: string | null
          id?: number
          language?: string | null
          opened_at?: string | null
          recipient: string
          reservation_id?: string | null
          sent_at?: string | null
          status?: string
          token?: string | null
          villa_id?: string | null
        }
        Update: {
          clicked_at?: string | null
          created_at?: string | null
          email_type?: string
          error_message?: string | null
          external_id?: string | null
          id?: number
          language?: string | null
          opened_at?: string | null
          recipient?: string
          reservation_id?: string | null
          sent_at?: string | null
          status?: string
          token?: string | null
          villa_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_logs_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_villa_id_fkey"
            columns: ["villa_id"]
            isOneToOne: false
            referencedRelation: "villas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "email_logs_villa_id_fkey"
            columns: ["villa_id"]
            isOneToOne: false
            referencedRelation: "villas_with_owner"
            referencedColumns: ["id"]
          },
        ]
      }
      features: {
        Row: {
          created_at: string | null
          id: string
          is_active: boolean | null
          key: string
          label: string
          name: string | null
          slug: string | null
          sort_index: number | null
          sort_order: number | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          key: string
          label: string
          name?: string | null
          slug?: string | null
          sort_index?: number | null
          sort_order?: number | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          key?: string
          label?: string
          name?: string | null
          slug?: string | null
          sort_index?: number | null
          sort_order?: number | null
        }
        Relationships: []
      }
      owner_portal_tokens: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          owner_id: string
          reservation_id: string
          token: string
          used_at: string | null
          villa_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          owner_id: string
          reservation_id: string
          token?: string
          used_at?: string | null
          villa_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          owner_id?: string
          reservation_id?: string
          token?: string
          used_at?: string | null
          villa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "owner_portal_tokens_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_portal_tokens_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners_with_villas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_portal_tokens_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: false
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_portal_tokens_villa_id_fkey"
            columns: ["villa_id"]
            isOneToOne: false
            referencedRelation: "villas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "owner_portal_tokens_villa_id_fkey"
            columns: ["villa_id"]
            isOneToOne: false
            referencedRelation: "villas_with_owner"
            referencedColumns: ["id"]
          },
        ]
      }
      owners: {
        Row: {
          created_at: string
          email: string
          full_name: string
          id: string
          phone: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          email: string
          full_name: string
          id?: string
          phone: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          email?: string
          full_name?: string
          id?: string
          phone?: string
          updated_at?: string
        }
        Relationships: []
      }
      past_reservations: {
        Row: {
          archived_at: string
          checkout_date: string
          guest_name: string
          guest_phone: string
          id: string
          total_price: number
          villa_name: string
        }
        Insert: {
          archived_at?: string
          checkout_date: string
          guest_name: string
          guest_phone: string
          id?: string
          total_price: number
          villa_name: string
        }
        Update: {
          archived_at?: string
          checkout_date?: string
          guest_name?: string
          guest_phone?: string
          id?: string
          total_price?: number
          villa_name?: string
        }
        Relationships: []
      }
      reservations: {
        Row: {
          approved_at: string | null
          checkout_date: string | null
          created_at: string | null
          date_range: unknown
          guest_email: string | null
          guest_name: string | null
          guest_phone: string | null
          id: string
          notes: string | null
          owner_notified_at: string | null
          review_reminder_sent: boolean | null
          status: string | null
          total_price: number | null
          villa_id: string | null
        }
        Insert: {
          approved_at?: string | null
          checkout_date?: string | null
          created_at?: string | null
          date_range: unknown
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          notes?: string | null
          owner_notified_at?: string | null
          review_reminder_sent?: boolean | null
          status?: string | null
          total_price?: number | null
          villa_id?: string | null
        }
        Update: {
          approved_at?: string | null
          checkout_date?: string | null
          created_at?: string | null
          date_range?: unknown
          guest_email?: string | null
          guest_name?: string | null
          guest_phone?: string | null
          id?: string
          notes?: string | null
          owner_notified_at?: string | null
          review_reminder_sent?: boolean | null
          status?: string | null
          total_price?: number | null
          villa_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reservations_villa_id_fkey"
            columns: ["villa_id"]
            isOneToOne: false
            referencedRelation: "villas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reservations_villa_id_fkey"
            columns: ["villa_id"]
            isOneToOne: false
            referencedRelation: "villas_with_owner"
            referencedColumns: ["id"]
          },
        ]
      }
      reviews: {
        Row: {
          access_token: string | null
          admin_notes: string | null
          approved_at: string | null
          approved_by: string | null
          cleanliness_rating: number | null
          comfort_rating: number | null
          comment: string | null
          created_at: string | null
          guest_email: string
          guest_name: string | null
          hospitality_rating: number | null
          id: string
          is_approved: boolean | null
          reservation_id: string
          token_expires_at: string | null
          token_used: boolean | null
          updated_at: string | null
          villa_id: string
        }
        Insert: {
          access_token?: string | null
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          cleanliness_rating?: number | null
          comfort_rating?: number | null
          comment?: string | null
          created_at?: string | null
          guest_email: string
          guest_name?: string | null
          hospitality_rating?: number | null
          id?: string
          is_approved?: boolean | null
          reservation_id: string
          token_expires_at?: string | null
          token_used?: boolean | null
          updated_at?: string | null
          villa_id: string
        }
        Update: {
          access_token?: string | null
          admin_notes?: string | null
          approved_at?: string | null
          approved_by?: string | null
          cleanliness_rating?: number | null
          comfort_rating?: number | null
          comment?: string | null
          created_at?: string | null
          guest_email?: string
          guest_name?: string | null
          hospitality_rating?: number | null
          id?: string
          is_approved?: boolean | null
          reservation_id?: string
          token_expires_at?: string | null
          token_used?: boolean | null
          updated_at?: string | null
          villa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reviews_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "admin_users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_reservation_id_fkey"
            columns: ["reservation_id"]
            isOneToOne: true
            referencedRelation: "reservations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_villa_id_fkey"
            columns: ["villa_id"]
            isOneToOne: false
            referencedRelation: "villas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reviews_villa_id_fkey"
            columns: ["villa_id"]
            isOneToOne: false
            referencedRelation: "villas_with_owner"
            referencedColumns: ["id"]
          },
        ]
      }
      villa_categories: {
        Row: {
          category_id: string
          villa_id: string
        }
        Insert: {
          category_id: string
          villa_id: string
        }
        Update: {
          category_id?: string
          villa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "villa_categories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "villa_categories_villa_id_fkey"
            columns: ["villa_id"]
            isOneToOne: false
            referencedRelation: "villas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "villa_categories_villa_id_fkey"
            columns: ["villa_id"]
            isOneToOne: false
            referencedRelation: "villas_with_owner"
            referencedColumns: ["id"]
          },
        ]
      }
      villa_discount_periods: {
        Row: {
          created_at: string
          end_date: string
          id: string
          nightly_price: number
          priority: number
          start_date: string
          villa_id: string
        }
        Insert: {
          created_at?: string
          end_date: string
          id?: string
          nightly_price: number
          priority: number
          start_date: string
          villa_id: string
        }
        Update: {
          created_at?: string
          end_date?: string
          id?: string
          nightly_price?: number
          priority?: number
          start_date?: string
          villa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "villa_discount_periods_villa_id_fkey"
            columns: ["villa_id"]
            isOneToOne: false
            referencedRelation: "villas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "villa_discount_periods_villa_id_fkey"
            columns: ["villa_id"]
            isOneToOne: false
            referencedRelation: "villas_with_owner"
            referencedColumns: ["id"]
          },
        ]
      }
      villa_features: {
        Row: {
          created_at: string | null
          feature_id: string
          villa_id: string
        }
        Insert: {
          created_at?: string | null
          feature_id: string
          villa_id: string
        }
        Update: {
          created_at?: string | null
          feature_id?: string
          villa_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "villa_features_feature_id_fkey"
            columns: ["feature_id"]
            isOneToOne: false
            referencedRelation: "features"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "villa_features_villa_id_fkey"
            columns: ["villa_id"]
            isOneToOne: false
            referencedRelation: "villas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "villa_features_villa_id_fkey"
            columns: ["villa_id"]
            isOneToOne: false
            referencedRelation: "villas_with_owner"
            referencedColumns: ["id"]
          },
        ]
      }
      villa_photos: {
        Row: {
          created_at: string | null
          id: string
          is_primary: boolean | null
          order_index: number | null
          url: string
          villa_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          order_index?: number | null
          url: string
          villa_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          is_primary?: boolean | null
          order_index?: number | null
          url?: string
          villa_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "villa_photos_villa_id_fkey"
            columns: ["villa_id"]
            isOneToOne: false
            referencedRelation: "villas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "villa_photos_villa_id_fkey"
            columns: ["villa_id"]
            isOneToOne: false
            referencedRelation: "villas_with_owner"
            referencedColumns: ["id"]
          },
        ]
      }
      villa_pricing_periods: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          nightly_price: number
          start_date: string
          villa_id: string | null
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          nightly_price: number
          start_date: string
          villa_id?: string | null
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          nightly_price?: number
          start_date?: string
          villa_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "villa_pricing_periods_villa_id_fkey"
            columns: ["villa_id"]
            isOneToOne: false
            referencedRelation: "villas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "villa_pricing_periods_villa_id_fkey"
            columns: ["villa_id"]
            isOneToOne: false
            referencedRelation: "villas_with_owner"
            referencedColumns: ["id"]
          },
        ]
      }
      villas: {
        Row: {
          baby_bed: boolean
          bathrooms: number | null
          bedrooms: number | null
          billiards: boolean
          capacity: number | null
          children_pool: boolean
          cleaning_fee: number
          created_at: string | null
          description: string | null
          district: string | null
          document_number: string | null
          fireplace: boolean
          foosball: boolean
          generator: boolean
          hammam: boolean
          has_pool: boolean | null
          heated_pool: boolean
          high_chair: boolean
          id: string
          in_site: boolean
          indoor_pool: boolean
          internet: boolean
          is_hidden: boolean | null
          jacuzzi: boolean
          lat: number | null
          lng: number | null
          master_bathroom: boolean
          name: string
          neighborhood: string | null
          owner_id: string | null
          pet_friendly: boolean
          playground: boolean
          priority: number
          private_pool: boolean
          province: string | null
          reference_code: string | null
          sauna: boolean
          sea_distance: string | null
          security: boolean
          sheltered_pool: boolean
          table_tennis: boolean
          tv_satellite: boolean
          underfloor_heating: boolean
          updated_at: string | null
        }
        Insert: {
          baby_bed?: boolean
          bathrooms?: number | null
          bedrooms?: number | null
          billiards?: boolean
          capacity?: number | null
          children_pool?: boolean
          cleaning_fee?: number
          created_at?: string | null
          description?: string | null
          district?: string | null
          document_number?: string | null
          fireplace?: boolean
          foosball?: boolean
          generator?: boolean
          hammam?: boolean
          has_pool?: boolean | null
          heated_pool?: boolean
          high_chair?: boolean
          id?: string
          in_site?: boolean
          indoor_pool?: boolean
          internet?: boolean
          is_hidden?: boolean | null
          jacuzzi?: boolean
          lat?: number | null
          lng?: number | null
          master_bathroom?: boolean
          name: string
          neighborhood?: string | null
          owner_id?: string | null
          pet_friendly?: boolean
          playground?: boolean
          priority?: number
          private_pool?: boolean
          province?: string | null
          reference_code?: string | null
          sauna?: boolean
          sea_distance?: string | null
          security?: boolean
          sheltered_pool?: boolean
          table_tennis?: boolean
          tv_satellite?: boolean
          underfloor_heating?: boolean
          updated_at?: string | null
        }
        Update: {
          baby_bed?: boolean
          bathrooms?: number | null
          bedrooms?: number | null
          billiards?: boolean
          capacity?: number | null
          children_pool?: boolean
          cleaning_fee?: number
          created_at?: string | null
          description?: string | null
          district?: string | null
          document_number?: string | null
          fireplace?: boolean
          foosball?: boolean
          generator?: boolean
          hammam?: boolean
          has_pool?: boolean | null
          heated_pool?: boolean
          high_chair?: boolean
          id?: string
          in_site?: boolean
          indoor_pool?: boolean
          internet?: boolean
          is_hidden?: boolean | null
          jacuzzi?: boolean
          lat?: number | null
          lng?: number | null
          master_bathroom?: boolean
          name?: string
          neighborhood?: string | null
          owner_id?: string | null
          pet_friendly?: boolean
          playground?: boolean
          priority?: number
          private_pool?: boolean
          province?: string | null
          reference_code?: string | null
          sauna?: boolean
          sea_distance?: string | null
          security?: boolean
          sheltered_pool?: boolean
          table_tennis?: boolean
          tv_satellite?: boolean
          underfloor_heating?: boolean
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "villas_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "villas_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners_with_villas"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      owners_with_villas: {
        Row: {
          created_at: string | null
          email: string | null
          full_name: string | null
          id: string | null
          phone: string | null
          updated_at: string | null
          villa_ids: string[] | null
        }
        Relationships: []
      }
      villas_with_owner: {
        Row: {
          district: string | null
          id: string | null
          is_hidden: boolean | null
          name: string | null
          owner_full_name: string | null
          owner_id: string | null
          priority: number | null
          province: string | null
        }
        Relationships: [
          {
            foreignKeyName: "villas_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "villas_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "owners_with_villas"
            referencedColumns: ["id"]
          },
        ]
      }
      vw_discount_villas: {
        Row: {
          capacity: number | null
          cover_url: string | null
          discount_id: string | null
          discount_percent: number | null
          discounted_price: number | null
          end_date: string | null
          original_avg_price: number | null
          priority: number | null
          start_date: string | null
          villa_id: string | null
          villa_name: string | null
        }
        Relationships: [
          {
            foreignKeyName: "villa_discount_periods_villa_id_fkey"
            columns: ["villa_id"]
            isOneToOne: false
            referencedRelation: "villas"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "villa_discount_periods_villa_id_fkey"
            columns: ["villa_id"]
            isOneToOne: false
            referencedRelation: "villas_with_owner"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      admin_search_reservations: {
        Args: { q: string }
        Returns: {
          checkin: string
          checkout: string
          guest_name: string
          guest_phone: string
          id: string
          status: string
          villa_id: string
          villa_name: string
        }[]
      }
      approve_pending_reservation: { Args: { p_id: string }; Returns: Json }
      archive_past_reservations: { Args: never; Returns: undefined }
      cancel_reservation: { Args: { p_id: string }; Returns: Json }
      cleanup_expired_calendar_periods: {
        Args: { p_now?: string }
        Returns: {
          cleanup_date: string
          deleted_blocked_dates: number
          deleted_discount_periods: number
          deleted_pricing_periods: number
        }[]
      }
      compute_reservation_total: {
        Args: { p_range: unknown; p_villa: string }
        Returns: number
      }
      create_reservation: {
        Args: {
          p_checkin: string
          p_checkout: string
          p_guest_email?: string
          p_guest_name: string
          p_guest_phone: string
          p_notes?: string
          p_status?: string
          p_villa_id: string
        }
        Returns: Json
      }
      ensure_review_token_for_reservation: {
        Args: { p_reservation_id: string }
        Returns: {
          access_token: string
          reservation_id: string
          token_expires_at: string
          villa_id: string
        }[]
      }
      generate_review_token: {
        Args: { reservation_id_param: string }
        Returns: Json
      }
      get_pending_review_emails: {
        Args: never
        Returns: {
          email_log_id: number
          guest_name: string
          recipient: string
          reservation_id: string
          token: string
          villa_id: string
          villa_name: string
        }[]
      }
      get_review_candidates: {
        Args: never
        Returns: {
          checkout_date: string
          guest_email: string
          guest_name: string
          reservation_id: string
          villa_id: string
          villa_name: string
        }[]
      }
      get_villa_rating_summary: {
        Args: { villa_id_param: string }
        Returns: {
          average_rating: number
          avg_cleanliness: number
          avg_comfort: number
          avg_hospitality: number
          total_reviews: number
        }[]
      }
      process_daily_checkout_reviews: { Args: never; Returns: Json }
      reject_pending_reservation: { Args: { p_id: string }; Returns: Json }
      search_villas_suggest: {
        Args: { lim?: number; q: string }
        Returns: {
          cover_url: string
          id: string
          name: string
          rank: number
          reference_code: string
        }[]
      }
      show_limit: { Args: never; Returns: number }
      show_trgm: { Args: { "": string }; Returns: string[] }
      sync_villa_features_from_boolean_columns: {
        Args: { p_villa_id?: string }
        Returns: Json
      }
      test_review_process: {
        Args: { test_reservation_id?: string }
        Returns: Json
      }
      unaccent: { Args: { "": string }; Returns: string }
      validate_review_token: { Args: { token_value: string }; Returns: Json }
      villa_daily_prices: {
        Args: { p_checkin: string; p_checkout: string; p_villa_id: string }
        Returns: {
          day: string
          nightly_price: number
          source: string
        }[]
      }
      villa_total_price: {
        Args: { p_checkin: string; p_checkout: string; p_villa_id: string }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
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
  public: {
    Enums: {},
  },
} as const
