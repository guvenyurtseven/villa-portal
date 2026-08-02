import type {
  BlockedDate,
  CalendarData,
  DiscountPeriod,
  PricingPeriod,
  Reservation,
  Villa,
  VillaPhoto,
} from "@/lib/adminCalendar/types";
import {
  isReservationStatus,
  type ReservationStatus,
} from "@/domain/reservations/ReservationStatus";

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object") return null;
  return value as Record<string, unknown>;
}

function toArray<T = unknown>(value: unknown): T[] {
  if (Array.isArray(value)) return value as T[];

  const record = asRecord(value);
  if (record && Array.isArray(record.data)) return record.data as T[];
  if (record && Array.isArray(record.items)) return record.items as T[];

  return [];
}

function normalizePhoto(value: unknown): VillaPhoto {
  const photo = asRecord(value);

  return {
    id: photo?.id == null ? null : String(photo.id),
    url: String(photo?.url || ""),
    is_primary: Boolean(photo?.is_primary),
    order_index:
      typeof photo?.order_index === "number"
        ? photo.order_index
        : photo?.order_index == null
          ? null
          : Number(photo.order_index),
  };
}

function normalizeVilla(raw: unknown): Villa | null {
  const rawRecord = asRecord(raw);
  const candidate = rawRecord?.villa ?? rawRecord?.data ?? raw;
  const villa = asRecord(candidate);
  if (!villa) return null;

  const photosRaw = Array.isArray(villa.photos)
    ? villa.photos
    : Array.isArray(villa.villa_photos)
      ? villa.villa_photos
      : [];

  if (!villa.name && villa.ok) return null;

  return {
    id: String(villa.id ?? ""),
    name: String(villa.name ?? ""),
    photos: photosRaw.map(normalizePhoto),
  };
}

async function fetchJson(url: string) {
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return res.json() as Promise<unknown>;
}

export async function fetchVillaCore(id: string): Promise<Villa> {
  const adminJson = await fetchJson(`/api/admin/villas/${id}`);
  const candidate = normalizeVilla(adminJson);

  return candidate ?? { id, name: "(İsimsiz Villa)", photos: [] };
}

function normalizeDiscountPeriods(raw: unknown): DiscountPeriod[] {
  const record = asRecord(raw);
  const periods = Array.isArray(record?.periods) ? record.periods : [];

  return [...(periods as DiscountPeriod[])].sort((a, b) =>
    String(a.start_date).localeCompare(String(b.start_date)),
  );
}

function normalizeReservation(value: unknown): Reservation {
  const reservation = asRecord(value);
  const rawStatus = reservation?.status;
  const status: ReservationStatus = isReservationStatus(rawStatus) ? rawStatus : "pending";

  return {
    id: String(reservation?.id ?? ""),
    date_range: String(reservation?.date_range ?? ""),
    guest_name: String(reservation?.guest_name ?? ""),
    guest_email: String(reservation?.guest_email ?? ""),
    guest_phone: String(reservation?.guest_phone ?? ""),
    status,
    total_price:
      typeof reservation?.total_price === "number"
        ? reservation.total_price
        : reservation?.total_price == null
          ? null
          : Number(reservation.total_price),
  };
}

export async function fetchCalendarData(id: string): Promise<CalendarData> {
  const villa = await fetchVillaCore(id);

  const reservationsRes = await fetch(`/api/reservations?villa_id=${id}`, {
    cache: "no-store",
  });
  const reservations = toArray(await reservationsRes.json()).map(normalizeReservation);

  const blockedDatesRes = await fetch(`/api/admin/blocked-dates?villa_id=${id}`, {
    cache: "no-store",
  });
  const blockedDates = toArray<BlockedDate>(await blockedDatesRes.json());

  const pricingPeriodsRes = await fetch(`/api/admin/pricing-periods?villa_id=${id}`, {
    cache: "no-store",
  });
  const pricingPeriods = toArray<PricingPeriod>(await pricingPeriodsRes.json());

  const discountPeriodsRes = await fetch(`/api/admin/discount-periods?villa_id=${id}`, {
    cache: "no-store",
  });
  let discountPeriods: DiscountPeriod[] | null = null;

  if (discountPeriodsRes.ok) {
    discountPeriods = normalizeDiscountPeriods(await discountPeriodsRes.json());
  } else {
    console.error("discount-periods GET failed:", discountPeriodsRes.status);
  }

  return {
    villa,
    reservations,
    blockedDates,
    pricingPeriods,
    discountPeriods,
  };
}
