import type { CSSProperties } from "react";
import { addDays, parseISO, startOfDay } from "date-fns";
import { parsePgDateRange } from "@/lib/pgRange";
import type {
  BlockedDate,
  DiscountPeriod,
  PricingPeriod,
  Reservation,
} from "@/lib/adminCalendar/types";

export type CalendarDisabledDate = Date | { before: Date };
export type PeriodModifiers = Record<string, Date[]>;
export type PeriodStyles = Record<string, CSSProperties>;

export function parseCalendarDateRange(dateRange: string): { start: string; end: string } {
  const parsed = parsePgDateRange(dateRange);
  return parsed ? { start: parsed.start, end: parsed.endExclusive } : { start: "", end: "" };
}

function parseCalendarDates(dateRange: string | null | undefined) {
  const parsed = parsePgDateRange(dateRange);
  if (!parsed) return null;

  return {
    start: startOfDay(parseISO(parsed.start)),
    end: startOfDay(parseISO(parsed.endExclusive)),
  };
}

function uniqueSortedDates(days: Date[]) {
  return Array.from(new Map(days.map((day) => [day.toISOString(), day])).values()).sort((a, b) =>
    a < b ? -1 : a > b ? 1 : 0,
  );
}

function confirmedReservations(reservations: Reservation[]) {
  return reservations.filter((reservation) => reservation.status === "confirmed");
}

export function getCheckInDays(reservations: Reservation[], blockedDates: BlockedDate[]) {
  const days: Date[] = [];

  confirmedReservations(reservations).forEach((reservation) => {
    const range = parseCalendarDates(reservation.date_range);
    if (range) days.push(range.start);
  });

  blockedDates.forEach((blockedDate) => {
    const range = parseCalendarDates(blockedDate.date_range);
    if (range) days.push(range.start);
  });

  return uniqueSortedDates(days);
}

export function getCheckOutDays(reservations: Reservation[], blockedDates: BlockedDate[]) {
  const days: Date[] = [];

  confirmedReservations(reservations).forEach((reservation) => {
    const range = parseCalendarDates(reservation.date_range);
    if (range) days.push(range.end);
  });

  blockedDates.forEach((blockedDate) => {
    const range = parseCalendarDates(blockedDate.date_range);
    if (range) days.push(range.end);
  });

  return uniqueSortedDates(days);
}

export function getTurnoverDays(checkInDays: Date[], checkOutDays: Date[]) {
  const checkInSet = new Set(checkInDays.map((day) => day.getTime()));
  const checkOutSet = new Set(checkOutDays.map((day) => day.getTime()));
  const turnoverDays: Date[] = [];

  checkInSet.forEach((time) => {
    if (checkOutSet.has(time)) turnoverDays.push(new Date(time));
  });

  return turnoverDays;
}

export function getFullyBookedDays(reservations: Reservation[], blockedDates: BlockedDate[]) {
  const days: Date[] = [];

  confirmedReservations(reservations).forEach((reservation) => {
    const range = parseCalendarDates(reservation.date_range);
    if (!range) return;

    let current = addDays(range.start, 1);
    while (current < range.end) {
      days.push(current);
      current = addDays(current, 1);
    }
  });

  blockedDates.forEach((blockedDate) => {
    const range = parseCalendarDates(blockedDate.date_range);
    if (!range) return;

    let current = addDays(range.start, 1);
    while (current < range.end) {
      days.push(current);
      current = addDays(current, 1);
    }
  });

  return uniqueSortedDates(days);
}

export function getDisabledDates(
  fullyBookedDays: Date[],
  turnoverDays: Date[],
): CalendarDisabledDate[] {
  return [{ before: startOfDay(new Date()) }, ...fullyBookedDays, ...turnoverDays];
}

function buildPeriodModifiers(
  periods: Array<{ start_date: string; end_date: string }>,
  prefix: string,
) {
  const modifiers: PeriodModifiers = {};

  periods.forEach((period, index) => {
    const days: Date[] = [];
    const start = parseISO(period.start_date);
    const end = parseISO(period.end_date);

    let current = new Date(start);
    while (current <= end) {
      days.push(new Date(current));
      current = addDays(current, 1);
    }

    modifiers[`${prefix}_${index}`] = days;
  });

  return modifiers;
}

function buildPeriodStyles(
  periods: Array<{ id: string }>,
  prefix: string,
  underlineColor: string,
) {
  const styles: PeriodStyles = {};

  periods.forEach((_, index) => {
    styles[`${prefix}_${index}`] = {
      position: "relative",
      boxShadow: `inset 0 -4px ${underlineColor}`,
    };
  });

  return styles;
}

export function buildPricingModifiers(pricingPeriods: PricingPeriod[]) {
  return buildPeriodModifiers(pricingPeriods, "pricing");
}

export function buildPricingStyles(pricingPeriods: PricingPeriod[]) {
  return buildPeriodStyles(pricingPeriods, "pricing", "#f9a8d4");
}

export function buildDiscountModifiers(discountPeriods: DiscountPeriod[]) {
  return buildPeriodModifiers(discountPeriods, "discount");
}

export function buildDiscountStyles(discountPeriods: DiscountPeriod[]) {
  return buildPeriodStyles(discountPeriods, "discount", "#ef4444");
}
