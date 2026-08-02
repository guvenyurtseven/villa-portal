import type { DateRange } from "react-day-picker";
import type { ReservationStatus } from "@/domain/reservations/ReservationStatus";
import type { BlockReason } from "@/lib/adminCalendar/types";

export interface DateRangeChangeHandler {
  (value: DateRange | undefined): void;
}

export interface StringChangeHandler {
  (value: string): void;
}

export interface NumberChangeHandler {
  (value: number): void;
}

export interface BlockReasonChangeHandler {
  (value: BlockReason): void;
}

export interface IdHandler {
  (id: string): void;
}

export interface ReservationStatusHandler {
  (id: string, status: ReservationStatus): void;
}
