import type { PriceBreakdownItem } from "@/lib/availabilityCalendar/calculations";

export type AvailabilityQuote = {
  from: Date;
  to: Date;
  nights: number;
  perNight: number;
  subtotal: number;
  discount: number;
  cleaningFee: number;
  hasCleaningFee: boolean;
  total: number;
  deposit: number;
  priceBreakdown: PriceBreakdownItem[];
};

export type BookingSearchParamsInput = {
  villaId?: string;
  villaName: string;
  villaImage: string;
  quote: AvailabilityQuote;
};

export function buildBookingSearchParams({
  villaId,
  villaName,
  villaImage,
  quote,
}: BookingSearchParamsInput) {
  return new URLSearchParams({
    villaId: villaId || "",
    villaName,
    villaImage,
    from: quote.from.toISOString(),
    to: quote.to.toISOString(),
    nights: String(quote.nights),
    total: String(quote.total),
    deposit: String(quote.deposit),
    cleaningFee: String(quote.cleaningFee || 0),
    hasCleaningFee: String(quote.hasCleaningFee || false),
  });
}
