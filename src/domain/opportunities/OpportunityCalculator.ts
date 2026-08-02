import {
  addDaysToIsoDate,
  dateToIsoDate,
  isoDateToUtcDate,
  parsePgDateRange,
} from "@/lib/pgRange";

const MS_PER_DAY = 86_400_000;
const DEFAULT_MIN_NIGHTS = 2;
const DEFAULT_MAX_NIGHTS = 7;

export type OpportunityBusyRange = {
  start: string;
  endExclusive: string;
};

export type OpportunityDateRangeRow = {
  date_range?: string | null;
};

export type OpportunityPricingPeriod = {
  start_date?: string | null;
  end_date?: string | null;
  nightly_price?: number | string | null;
};

export type PricedOpportunity = {
  startDate: string;
  endDate: string;
  nights: number;
  totalPrice: number;
  nightlyPrice: number;
};

export type LegacyDiscountedOpportunity = {
  startDate: string;
  endDate: string;
  nights: number;
  originalPrice: number;
  discountedPrice: number;
  discountPercentage: number;
};

type PriceCoverage = {
  ok: boolean;
  total: number;
};

type NightBounds = {
  minNights?: number;
  maxNights?: number;
};

type CheckoutGapOptions = NightBounds & {
  busyRanges: readonly OpportunityBusyRange[];
  pricingPeriods: readonly OpportunityPricingPeriod[];
  today?: Date;
  windowDays?: number;
};

type PublicDetailOptions = NightBounds & {
  busyRanges: readonly OpportunityBusyRange[];
  pricingPeriods: readonly OpportunityPricingPeriod[];
  today?: Date;
};

type LegacyDiscountedWindowOptions = NightBounds & {
  busyRanges: readonly OpportunityBusyRange[];
  pricingPeriods: readonly OpportunityPricingPeriod[];
  today?: Date;
  windowDays?: number;
  discountPercentage?: number;
  maxOpportunities?: number;
};

function toIsoDateOrThrow(date: Date) {
  const isoDate = dateToIsoDate(date);
  if (!isoDate) throw new Error("Invalid opportunity date");
  return isoDate;
}

function addDaysOrThrow(isoDate: string, days: number) {
  const next = addDaysToIsoDate(isoDate, days);
  if (!next) throw new Error(`Invalid ISO date: ${isoDate}`);
  return next;
}

function isValidIsoRange(range: OpportunityBusyRange) {
  return (
    Boolean(isoDateToUtcDate(range.start)) &&
    Boolean(isoDateToUtcDate(range.endExclusive)) &&
    range.start <= range.endExclusive
  );
}

function maxIsoDate(a: string, b: string) {
  return a > b ? a : b;
}

function minIsoDate(a: string, b: string) {
  return a < b ? a : b;
}

function signedNightsBetweenIsoDates(start: string, endExclusive: string) {
  const startDate = isoDateToUtcDate(start);
  const endDate = isoDateToUtcDate(endExclusive);
  if (!startDate || !endDate) return 0;
  return Math.round((endDate.getTime() - startDate.getTime()) / MS_PER_DAY);
}

function countNights(start: string, endExclusive: string) {
  return Math.max(0, signedNightsBetweenIsoDates(start, endExclusive));
}

function isWithinNightBounds(nights: number, bounds: Required<NightBounds>) {
  return nights >= bounds.minNights && nights <= bounds.maxNights;
}

function normalizeNightBounds(bounds: NightBounds): Required<NightBounds> {
  return {
    minNights: bounds.minNights ?? DEFAULT_MIN_NIGHTS,
    maxNights: bounds.maxNights ?? DEFAULT_MAX_NIGHTS,
  };
}

function containsIsoDate(period: OpportunityPricingPeriod, isoDate: string) {
  if (!period.start_date || !period.end_date) return false;
  return isoDate >= period.start_date && isoDate <= period.end_date;
}

function hasPriceForIsoDate(
  pricingPeriods: readonly OpportunityPricingPeriod[],
  isoDate: string,
) {
  return pricingPeriods.some((period) => containsIsoDate(period, isoDate));
}

export function toBusyRangeFromPgDateRange(
  dateRange: string | null | undefined,
): OpportunityBusyRange | null {
  const parsed = parsePgDateRange(dateRange);
  if (!parsed || parsed.start >= parsed.endExclusive) return null;
  return { start: parsed.start, endExclusive: parsed.endExclusive };
}

export function buildBusyRangesFromDateRangeRows<T extends OpportunityDateRangeRow>(
  rows: readonly T[] | null | undefined,
) {
  return (rows ?? [])
    .map((row) => toBusyRangeFromPgDateRange(row.date_range))
    .filter((range): range is OpportunityBusyRange => Boolean(range));
}

export function mergeBusyRanges(ranges: readonly OpportunityBusyRange[]) {
  const sorted = ranges
    .filter(isValidIsoRange)
    .slice()
    .sort((a, b) => (a.start < b.start ? -1 : a.start > b.start ? 1 : 0));

  if (sorted.length <= 1) return sorted;

  const merged: OpportunityBusyRange[] = [];
  let current = { ...sorted[0] };

  for (let i = 1; i < sorted.length; i++) {
    const next = sorted[i];
    if (next.start <= current.endExclusive) {
      current.endExclusive = maxIsoDate(current.endExclusive, next.endExclusive);
      continue;
    }

    merged.push(current);
    current = { ...next };
  }

  merged.push(current);
  return merged;
}

export function collectUnavailableIsoDays(ranges: readonly OpportunityBusyRange[]) {
  const unavailableDays = new Set<string>();

  for (const range of ranges) {
    if (!isValidIsoRange(range) || range.start >= range.endExclusive) continue;

    let current = range.start;
    while (current < range.endExclusive) {
      unavailableDays.add(current);
      current = addDaysOrThrow(current, 1);
    }
  }

  return unavailableDays;
}

export function calculatePriceCoverage(
  pricingPeriods: readonly OpportunityPricingPeriod[],
  range: OpportunityBusyRange,
): PriceCoverage {
  if (range.start >= range.endExclusive || pricingPeriods.length === 0) {
    return { ok: false, total: 0 };
  }

  let current = range.start;
  let total = 0;

  while (current < range.endExclusive) {
    const period = pricingPeriods.find((candidate) => containsIsoDate(candidate, current));
    if (!period) return { ok: false, total: 0 };

    const nightlyPrice = Number(period.nightly_price);
    if (!Number.isFinite(nightlyPrice)) return { ok: false, total: 0 };

    total += nightlyPrice;
    current = addDaysOrThrow(current, 1);
  }

  return { ok: true, total };
}

function gapBetweenBusyRanges(
  previous: OpportunityBusyRange,
  next: OpportunityBusyRange,
): OpportunityBusyRange | null {
  if (previous.endExclusive >= next.start) return null;
  return { start: previous.endExclusive, endExclusive: next.start };
}

function clampBusyRangeToWindow(
  range: OpportunityBusyRange,
  windowStart: string,
  windowEnd: string,
): OpportunityBusyRange | null {
  if (!isValidIsoRange(range)) return null;
  if (range.endExclusive <= windowStart || range.start >= windowEnd) return null;

  const start = maxIsoDate(range.start, windowStart);
  const endExclusive = minIsoDate(range.endExclusive, windowEnd);
  if (start >= endExclusive) return null;

  return { start, endExclusive };
}

export function calculateCheckoutGapOpportunities({
  busyRanges,
  pricingPeriods,
  today = new Date(),
  windowDays = 60,
  minNights,
  maxNights,
}: CheckoutGapOptions): PricedOpportunity[] {
  const bounds = normalizeNightBounds({ minNights, maxNights });
  const windowStart = toIsoDateOrThrow(today);
  const windowEnd = addDaysOrThrow(windowStart, windowDays);

  const clampedBusyRanges = mergeBusyRanges(busyRanges)
    .map((range) => clampBusyRangeToWindow(range, windowStart, windowEnd))
    .filter((range): range is OpportunityBusyRange => Boolean(range));

  const timeline = mergeBusyRanges([
    { start: windowStart, endExclusive: windowStart },
    ...clampedBusyRanges,
    { start: windowEnd, endExclusive: windowEnd },
  ]);

  const opportunities: PricedOpportunity[] = [];

  for (let i = 0; i < timeline.length - 1; i++) {
    const gap = gapBetweenBusyRanges(timeline[i], timeline[i + 1]);
    if (!gap) continue;

    const nights = countNights(gap.start, gap.endExclusive);
    if (!isWithinNightBounds(nights, bounds)) continue;

    const coverage = calculatePriceCoverage(pricingPeriods, gap);
    if (!coverage.ok) continue;

    opportunities.push({
      startDate: gap.start,
      endDate: gap.endExclusive,
      nights,
      totalPrice: coverage.total,
      nightlyPrice: Math.round(coverage.total / nights),
    });
  }

  return opportunities;
}

export function calculatePublicDetailOpportunities({
  busyRanges,
  pricingPeriods,
  today = new Date(),
  minNights,
  maxNights,
}: PublicDetailOptions): PricedOpportunity[] {
  const bounds = normalizeNightBounds({ minNights, maxNights });
  const unavailableDays = collectUnavailableIsoDays(busyRanges);
  const sortedUnavailableDays = Array.from(unavailableDays).sort();
  const opportunities: PricedOpportunity[] = [];

  for (let i = 0; i < sortedUnavailableDays.length - 1; i++) {
    const gapStart = addDaysOrThrow(sortedUnavailableDays[i], 1);
    const gapEndExclusive = sortedUnavailableDays[i + 1];
    const nights = countNights(gapStart, gapEndExclusive);

    if (!isWithinNightBounds(nights, bounds)) continue;

    const coverage = calculatePriceCoverage(pricingPeriods, {
      start: gapStart,
      endExclusive: gapEndExclusive,
    });
    if (!coverage.ok || coverage.total <= 0) continue;

    opportunities.push({
      startDate: gapStart,
      endDate: addDaysOrThrow(gapEndExclusive, -1),
      nights,
      totalPrice: coverage.total,
      nightlyPrice: Math.round(coverage.total / nights),
    });
  }

  const todayIso = toIsoDateOrThrow(today);
  if (!unavailableDays.has(todayIso) && sortedUnavailableDays.length > 0) {
    const firstBookedDate = sortedUnavailableDays[0];
    const nights = Math.abs(signedNightsBetweenIsoDates(todayIso, firstBookedDate));

    if (isWithinNightBounds(nights, bounds)) {
      const gapEndExclusive = addDaysOrThrow(todayIso, nights);
      const coverage = calculatePriceCoverage(pricingPeriods, {
        start: todayIso,
        endExclusive: gapEndExclusive,
      });

      if (coverage.ok && coverage.total > 0) {
        opportunities.unshift({
          startDate: todayIso,
          endDate: addDaysOrThrow(gapEndExclusive, -1),
          nights,
          totalPrice: coverage.total,
          nightlyPrice: Math.round(coverage.total / nights),
        });
      }
    }
  }

  return opportunities;
}

export function calculateLegacyDiscountedWindowOpportunities({
  busyRanges,
  pricingPeriods,
  today = new Date(),
  windowDays = 30,
  minNights,
  maxNights,
  discountPercentage = 20,
  maxOpportunities = 5,
}: LegacyDiscountedWindowOptions): LegacyDiscountedOpportunity[] {
  const bounds = normalizeNightBounds({ minNights, maxNights });
  const unavailableDays = collectUnavailableIsoDays(busyRanges);
  const windowStart = toIsoDateOrThrow(today);
  const windowEnd = addDaysOrThrow(windowStart, windowDays);
  const opportunities: LegacyDiscountedOpportunity[] = [];

  let currentStart = windowStart;

  while (currentStart < windowEnd) {
    if (!unavailableDays.has(currentStart)) {
      let gapEnd = currentStart;
      let gapDays = 0;

      while (
        gapEnd < windowEnd &&
        gapDays < bounds.maxNights &&
        !unavailableDays.has(gapEnd) &&
        hasPriceForIsoDate(pricingPeriods, gapEnd)
      ) {
        gapEnd = addDaysOrThrow(gapEnd, 1);
        gapDays++;
      }

      if (isWithinNightBounds(gapDays, bounds)) {
        const coverage = calculatePriceCoverage(pricingPeriods, {
          start: currentStart,
          endExclusive: gapEnd,
        });

        if (coverage.ok && coverage.total > 0) {
          opportunities.push({
            startDate: currentStart,
            endDate: addDaysOrThrow(gapEnd, -1),
            nights: gapDays,
            originalPrice: coverage.total,
            discountedPrice: Math.round(coverage.total * (1 - discountPercentage / 100)),
            discountPercentage,
          });
        }
      }

      currentStart = addDaysOrThrow(gapEnd, 1);
      continue;
    }

    currentStart = addDaysOrThrow(currentStart, 1);
  }

  return opportunities.slice(0, maxOpportunities);
}
