export const RESERVATION_STATUSES = [
  "pending",
  "approved",
  "confirmed",
  "completed",
  "cancelled",
] as const;

export type ReservationStatus = (typeof RESERVATION_STATUSES)[number];

const STATUS_SET = new Set<string>(RESERVATION_STATUSES);

export function isReservationStatus(value: unknown): value is ReservationStatus {
  return typeof value === "string" && STATUS_SET.has(value);
}

export function reservationStatusLabel(status: string | null | undefined) {
  switch (status) {
    case "approved":
    case "confirmed":
      return "Onaylandi";
    case "completed":
      return "Tamamlandi";
    case "cancelled":
      return "Iptal";
    case "pending":
    default:
      return "Bekliyor";
  }
}

export function reservationStatusColor(status: string | null | undefined) {
  switch (status) {
    case "approved":
    case "confirmed":
      return "bg-green-100 text-green-700";
    case "completed":
      return "bg-blue-100 text-blue-700";
    case "cancelled":
      return "bg-red-100 text-red-700";
    case "pending":
    default:
      return "bg-yellow-100 text-yellow-700";
  }
}

export function canCancelReservation(status: string | null | undefined) {
  return status === "pending" || status === "approved" || status === "confirmed";
}
