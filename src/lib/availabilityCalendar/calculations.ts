import { addDays, format, isBefore, isWithinInterval, parseISO, startOfDay } from "date-fns";
import type { Matcher } from "react-day-picker";

export type UnavailableRange = {
  start: string;
  end: string;
  type: "reserved" | "blocked";
};

export type AvailabilityPricingPeriod = {
  id: string;
  villa_id: string;
  start_date: string;
  end_date: string;
  nightly_price: number;
};

export type AvailabilityDiscountPeriod = {
  id: string;
  villa_id: string;
  start_date: string;
  end_date: string;
  nightly_price: number;
  priority: number;
};

export type AvailabilityOpportunityPeriod = {
  startDate: string;
  endDate: string;
  nights?: number;
};

export type PriceBreakdownItem = {
  date: string;
  price: number;
};

export type PriceCalculationResult = {
  subtotal: number;
  priceBreakdown: PriceBreakdownItem[];
  nights: number;
  averagePerNight: number;
  hasUndefinedPrice: boolean;
  undefinedDates: string[];
};

export type AvailabilityModifiers = Record<string, Matcher | Matcher[]>;

function dateKey(date: Date) {
  return format(date, "yyyy-MM-dd");
}

function isTodayOrFuture(day: Date, today: Date) {
  return !isBefore(day, today);
}

export function getPriceForDate(
  date: Date,
  pricingPeriods: readonly AvailabilityPricingPeriod[],
) {
  for (const period of pricingPeriods) {
    const periodStart = parseISO(period.start_date);
    const periodEnd = parseISO(period.end_date);

    if (isWithinInterval(date, { start: periodStart, end: periodEnd })) {
      return Number(period.nightly_price);
    }
  }

  return null;
}

export function getDaysWithPrice(pricingPeriods: readonly AvailabilityPricingPeriod[]) {
  const days: Date[] = [];

  pricingPeriods.forEach((period) => {
    const start = parseISO(period.start_date);
    const end = parseISO(period.end_date);
    let current = new Date(start);

    while (current <= end) {
      days.push(new Date(current));
      current = addDays(current, 1);
    }
  });

  return days;
}

export function getDaysWithoutPrice(today: Date, daysWithPrice: readonly Date[]) {
  const days: Date[] = [];
  const endDate = addDays(today, 365);
  let current = new Date(today);

  while (current <= endDate) {
    const currentKey = dateKey(current);
    const hasPrice = daysWithPrice.some((day) => dateKey(day) === currentKey);

    if (!hasPrice) {
      days.push(new Date(current));
    }

    current = addDays(current, 1);
  }

  return days;
}

export function calculateTotalPrice(
  from: Date,
  to: Date,
  pricingPeriods: readonly AvailabilityPricingPeriod[],
): PriceCalculationResult {
  const priceBreakdown: PriceBreakdownItem[] = [];
  const undefinedDates: string[] = [];
  let subtotal = 0;
  let current = new Date(from);
  let nights = 0;

  while (current < to) {
    const nightlyPrice = getPriceForDate(current, pricingPeriods);

    if (nightlyPrice === null) {
      undefinedDates.push(format(current, "dd/MM/yyyy"));
    } else {
      subtotal += nightlyPrice;
      priceBreakdown.push({
        date: format(current, "dd/MM/yyyy"),
        price: nightlyPrice,
      });
    }

    current = addDays(current, 1);
    nights++;
  }

  const averagePerNight =
    nights > 0 && priceBreakdown.length > 0 ? subtotal / priceBreakdown.length : 0;

  return {
    subtotal,
    priceBreakdown,
    nights,
    averagePerNight,
    hasUndefinedPrice: undefinedDates.length > 0,
    undefinedDates,
  };
}

export function getCheckInDays(unavailable: readonly UnavailableRange[], today: Date) {
  const days: Date[] = [];

  unavailable.forEach((range) => {
    if (range.type !== "reserved") return;

    const day = startOfDay(parseISO(range.start));
    if (isTodayOrFuture(day, today)) days.push(day);
  });

  return days;
}

export function getCheckOutDays(unavailable: readonly UnavailableRange[], today: Date) {
  const days: Date[] = [];

  unavailable.forEach((range) => {
    if (range.type !== "reserved") return;

    const day = startOfDay(parseISO(range.end));
    if (isTodayOrFuture(day, today)) days.push(day);
  });

  return days;
}

export function getTurnoverDays(
  checkInDays: readonly Date[],
  checkOutDays: readonly Date[],
  today: Date,
) {
  const checkInTimes = new Set(checkInDays.map((day) => day.getTime()));
  const checkOutTimes = new Set(checkOutDays.map((day) => day.getTime()));
  const days: Date[] = [];

  checkInTimes.forEach((time) => {
    if (!checkOutTimes.has(time)) return;

    const day = new Date(time);
    if (isTodayOrFuture(day, today)) days.push(day);
  });

  return days;
}

export function getFullyBookedDays(unavailable: readonly UnavailableRange[], today: Date) {
  const days: Date[] = [];

  unavailable.forEach((range) => {
    const start = startOfDay(parseISO(range.start));
    const end = startOfDay(parseISO(range.end));

    if (range.type === "reserved") {
      let current = addDays(start, 1);

      while (current < end) {
        if (isTodayOrFuture(current, today)) days.push(new Date(current));
        current = addDays(current, 1);
      }

      return;
    }

    if (range.type === "blocked") {
      let current = new Date(start);

      while (current <= end) {
        if (isTodayOrFuture(current, today)) days.push(new Date(current));
        current = addDays(current, 1);
      }
    }
  });

  return days;
}

export function getDisabledMatchers(
  today: Date,
  fullyBookedDays: readonly Date[],
  turnoverDays: readonly Date[],
  daysWithoutPrice: readonly Date[],
): Matcher[] {
  return [{ before: today }, ...fullyBookedDays, ...turnoverDays, ...daysWithoutPrice];
}

export function rangeConflictsWithUnavailable(
  start: Date,
  end: Date,
  fullyBookedDays: readonly Date[],
) {
  const from = startOfDay(start);
  const to = startOfDay(end);
  let current = new Date(from);

  while (current <= to) {
    if (fullyBookedDays.some((day) => day.getTime() === current.getTime())) {
      return true;
    }

    current = addDays(current, 1);
  }

  return false;
}

export function getDiscountDays(
  discountPeriods: readonly AvailabilityDiscountPeriod[],
  today: Date,
) {
  const days: Date[] = [];

  discountPeriods.forEach((period) => {
    const start = parseISO(period.start_date);
    const end = parseISO(period.end_date);
    let current = new Date(start);

    while (current <= end) {
      if (isTodayOrFuture(current, today)) days.push(new Date(current));
      current = addDays(current, 1);
    }
  });

  return days;
}

export function getOpportunityDays(
  opportunities: readonly AvailabilityOpportunityPeriod[],
  today: Date,
) {
  const days: Date[] = [];

  opportunities.forEach((opportunity) => {
    const start = parseISO(opportunity.startDate);
    const end = parseISO(opportunity.endDate);
    let current = new Date(start);

    while (current <= end) {
      if (isTodayOrFuture(current, today)) days.push(new Date(current));
      current = addDays(current, 1);
    }
  });

  return days;
}

export function buildAvailabilityModifiers({
  today,
  daysWithoutPrice,
  checkInDays,
  checkOutDays,
  turnoverDays,
  fullyBookedDays,
  daysWithPrice,
  discountDays,
  opportunityDays,
}: {
  today: Date;
  daysWithoutPrice: readonly Date[];
  checkInDays: readonly Date[];
  checkOutDays: readonly Date[];
  turnoverDays: readonly Date[];
  fullyBookedDays: readonly Date[];
  daysWithPrice: readonly Date[];
  discountDays: readonly Date[];
  opportunityDays: readonly Date[];
}): AvailabilityModifiers {
  const modifiers: AvailabilityModifiers = {
    past: { before: today },
    noPrice: [...daysWithoutPrice],
    checkIn: [...checkInDays],
    checkOut: [...checkOutDays],
    turnover: [...turnoverDays],
    fullyBooked: [...fullyBookedDays],
  };

  const availableDays = new Set<string>();

  daysWithPrice.forEach((day) => {
    const key = dateKey(day);

    if (
      day >= today &&
      !fullyBookedDays.some((bookedDay) => dateKey(bookedDay) === key) &&
      !turnoverDays.some((turnoverDay) => dateKey(turnoverDay) === key)
    ) {
      availableDays.add(key);
    }
  });

  const discountDaysFiltered: Date[] = [];
  discountDays.forEach((day) => {
    if (availableDays.has(dateKey(day))) discountDaysFiltered.push(day);
  });

  const opportunityDaysFiltered: Date[] = [];
  opportunityDays.forEach((day) => {
    const key = dateKey(day);
    if (
      availableDays.has(key) &&
      !discountDaysFiltered.some((discountDay) => dateKey(discountDay) === key)
    ) {
      opportunityDaysFiltered.push(day);
    }
  });

  const pricedOnlyDays: Date[] = [];
  daysWithPrice.forEach((day) => {
    const key = dateKey(day);

    if (
      availableDays.has(key) &&
      !discountDaysFiltered.some((discountDay) => dateKey(discountDay) === key) &&
      !opportunityDaysFiltered.some((opportunityDay) => dateKey(opportunityDay) === key)
    ) {
      pricedOnlyDays.push(day);
    }
  });

  modifiers.discountDays = discountDaysFiltered;
  modifiers.opportunityDays = opportunityDaysFiltered;
  modifiers.pricedOnly = pricedOnlyDays;

  return modifiers;
}
