import type { ReservationStatus } from "@/domain/reservations/ReservationStatus";

export type VillaPhoto = {
  id?: string | null;
  url: string;
  is_primary: boolean;
  order_index: number | null;
};

export type Villa = {
  id: string;
  name: string;
  photos?: VillaPhoto[];
};

export type Reservation = {
  id: string;
  date_range: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string;
  status: ReservationStatus;
  total_price: number | null;
};

export type BlockedDate = {
  id: string;
  date_range: string;
  reason: string;
};

export type PricingPeriod = {
  id: string;
  start_date: string;
  end_date: string;
  nightly_price: number;
};

export type DiscountPeriod = {
  id: string;
  villa_id: string;
  start_date: string;
  end_date: string;
  nightly_price: number;
  priority: number;
};

export type BlockReason = "rezervasyon" | "temizlik";

export type CalendarData = {
  villa: Villa;
  reservations: Reservation[];
  blockedDates: BlockedDate[];
  pricingPeriods: PricingPeriod[];
  discountPeriods: DiscountPeriod[] | null;
};
