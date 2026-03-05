export type Database = {
  public: {
    Tables: {
      villas: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          bedrooms: number | null;
          bathrooms: number | null;
          capacity: number | null;
          has_pool: boolean | null;
          sea_distance: string | null;
          lat: number | null;
          lng: number | null;
          province: string | null;
          district: string | null;
          neighborhood: string | null;
          cleaning_fee: number | null;
          is_hidden: boolean | null;
          priority: number | null;
          owner_id: string | null;
          document_number: string | null;
          reference_code: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["villas"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["villas"]["Row"]>;
      };
      villa_photos: {
        Row: {
          id: string;
          villa_id: string;
          url: string;
          is_primary: boolean | null;
          order_index: number | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["villa_photos"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["villa_photos"]["Row"]>;
      };
      reservations: {
        Row: {
          id: string;
          villa_id: string;
          date_range: string;
          guest_name: string | null;
          guest_email: string | null;
          guest_phone: string | null;
          total_price: number | null;
          status: "pending" | "approved" | "confirmed" | "cancelled";
          notes: string | null;
          checkout_date: string | null;
          owner_notified_at: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["reservations"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["reservations"]["Row"]>;
      };
      blocked_dates: {
        Row: {
          id: string;
          villa_id: string;
          date_range: string;
          reason: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["blocked_dates"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["blocked_dates"]["Row"]>;
      };
      villa_pricing_periods: {
        Row: {
          id: string;
          villa_id: string;
          start_date: string;
          end_date: string;
          nightly_price: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["villa_pricing_periods"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["villa_pricing_periods"]["Row"]>;
      };
      villa_discount_periods: {
        Row: {
          id: string;
          villa_id: string;
          start_date: string;
          end_date: string;
          nightly_price: number;
          priority: number;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["villa_discount_periods"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["villa_discount_periods"]["Row"]>;
      };
      owners: {
        Row: {
          id: string;
          full_name: string;
          email: string;
          phone: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["owners"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["owners"]["Row"]>;
      };
      owner_portal_tokens: {
        Row: {
          id: string;
          token: string;
          owner_id: string;
          villa_id: string;
          reservation_id: string;
          expires_at: string;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["owner_portal_tokens"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["owner_portal_tokens"]["Row"]>;
      };
      categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          cover_image: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["categories"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["categories"]["Row"]>;
      };
      villa_categories: {
        Row: {
          villa_id: string;
          category_id: string;
        };
        Insert: Partial<Database["public"]["Tables"]["villa_categories"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["villa_categories"]["Row"]>;
      };
      reviews: {
        Row: {
          id: string;
          villa_id: string | null;
          access_token: string;
          token_used: boolean;
          is_approved: boolean | null;
          cleanliness_rating: number | null;
          comfort_rating: number | null;
          hospitality_rating: number | null;
          comment: string | null;
          author_name: string | null;
          created_at: string;
          approved_at: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["reviews"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["reviews"]["Row"]>;
      };
      email_logs: {
        Row: {
          id: string;
          status: string;
          to_email: string | null;
          subject: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["email_logs"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["email_logs"]["Row"]>;
      };
      past_reservations: {
        Row: {
          id: string;
          guest_name: string | null;
          guest_phone: string | null;
          total_price: number | null;
          villa_name: string | null;
          checkout_date: string | null;
        };
        Insert: Partial<Database["public"]["Tables"]["past_reservations"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["past_reservations"]["Row"]>;
      };
      admin_users: {
        Row: {
          id: string;
          email: string;
          password_hash: string;
          name: string | null;
          is_active: boolean;
          last_login: string | null;
          created_at: string;
        };
        Insert: Partial<Database["public"]["Tables"]["admin_users"]["Row"]>;
        Update: Partial<Database["public"]["Tables"]["admin_users"]["Row"]>;
      };
    };
  };
};