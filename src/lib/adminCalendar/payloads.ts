import type { DateRange } from "react-day-picker";
import { dateToIsoDate } from "@/lib/pgRange";

function formatDateForPayload(date: Date) {
  const isoDate = dateToIsoDate(date);
  if (!isoDate) throw new Error("Invalid date");
  return isoDate;
}

export function buildPricingPeriodPayload(
  villaId: string,
  pricingRange: DateRange,
  nightlyPrice: string,
) {
  return {
    villa_id: villaId,
    start_date: formatDateForPayload(pricingRange.from!),
    end_date: formatDateForPayload(pricingRange.to!),
    nightly_price: parseFloat(nightlyPrice),
  };
}

export function buildDiscountPeriodPayload(
  villaId: string,
  discountRange: DateRange,
  discountPrice: string,
  discountPriority: number,
) {
  return {
    villa_id: villaId,
    start_date: formatDateForPayload(discountRange.from!),
    end_date: formatDateForPayload(discountRange.to!),
    nightly_price: Number(discountPrice),
    priority: Number(discountPriority) || 5,
  };
}

export function buildManualReservationPayload(
  villaId: string,
  selectedRange: DateRange,
  customerName: string,
  customerPhone: string,
  customerEmail: string,
) {
  return {
    villa_id: villaId,
    start_date: formatDateForPayload(selectedRange.from!),
    end_date: formatDateForPayload(selectedRange.to!),
    guest_name: customerName,
    guest_phone: customerPhone,
    guest_email: customerEmail || "",
    status: "confirmed",
    notes: "Admin tarafından oluşturuldu",
  };
}

export function buildBlockedDatePayload(villaId: string, selectedRange: DateRange) {
  return {
    villa_id: villaId,
    start_date: formatDateForPayload(selectedRange.from!),
    end_date: formatDateForPayload(selectedRange.to!),
    reason: "Temizlik",
  };
}
