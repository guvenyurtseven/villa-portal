export type Database = {
  public: {
    Tables: {
      villas: {
        Row: {
          id: string;
          name: string;
          location: string;
          lat: number | null;
          lng: number | null;
          weekly_price: number;
          description: string | null;
          bedrooms: number;
          bathrooms: number;
          has_pool: boolean;
          sea_distance: string | null;
          is_hidden: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: any;
        Update: any;
      };
      villa_photos: {
        Row: {
          id: string;
          villa_id: string;
          url: string;
          is_primary: boolean;
          order_index: number;
          created_at: string;
        };
        Insert: any;
        Update: any;
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
          status: "pending" | "confirmed" | "cancelled";
          notes: string | null;
          created_at: string;
        };
        Insert: any;
        Update: any;
      };
      blocked_dates: {
        Row: any;
        Insert: any;
        Update: any;
      };
      admin_users: {
        Row: any;
        Insert: any;
        Update: any;
      };
    };
  };
};
