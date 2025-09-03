export interface ReviewFormData {
  cleanliness_rating: number;
  comfort_rating: number;
  hospitality_rating: number;
  comment: string;
}

export interface ReservationData {
  is_valid: boolean;
  review_id?: string;
  reservation_id?: string;
  villa_id?: string;
  villa_name?: string;
  guest_email?: string;
  guest_name?: string;
  checkout_date?: string;
  error?: string;
}

export interface HoveredRatings {
  cleanliness: number;
  comfort: number;
  hospitality: number;
}

export type TokenStatus = "validating" | "valid" | "invalid" | "error";
