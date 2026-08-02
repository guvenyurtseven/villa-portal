const ISO_DATE_RE = /^[0-9]{4}-[0-9]{2}-[0-9]{2}$/;
const ISO_DATE_SCAN_RE = /[0-9]{4}-[0-9]{2}-[0-9]{2}/g;
const MS_PER_DAY = 86_400_000;

export type ParsedPgDateRange = {
  start: string;
  endExclusive: string;
};

export type ParsedPgDateRangeInclusive = ParsedPgDateRange & {
  endInclusive: string;
};

export type ParsedPgDateRangeDates = ParsedPgDateRange & {
  startDate: Date;
  endExclusiveDate: Date;
  nights: number;
};

export function isIsoDate(value: string) {
  if (!ISO_DATE_RE.test(value)) return false;
  return isoDateToUtcDate(value) !== null;
}

function padDatePart(value: number) {
  return String(value).padStart(2, "0");
}

export function dateToIsoDate(value: Date | null | undefined) {
  if (!value || !Number.isFinite(value.getTime())) return null;

  const year = value.getFullYear();
  const month = padDatePart(value.getMonth() + 1);
  const day = padDatePart(value.getDate());

  return `${year}-${month}-${day}`;
}

export function isoDateToUtcDate(value: string | null | undefined) {
  if (!value || !ISO_DATE_RE.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  if (!Number.isFinite(date.getTime())) return null;
  if (date.toISOString().slice(0, 10) !== value) return null;
  return date;
}

export function addDaysToIsoDate(value: string, days: number) {
  const date = isoDateToUtcDate(value);
  if (!date) return null;
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function toPgDateRange(start: string, endExclusive: string) {
  return `[${start},${endExclusive})`;
}

export function toPgDateRangeFromInclusiveEnd(start: string, endInclusive: string) {
  const endExclusive = addDaysToIsoDate(endInclusive, 1);
  if (!endExclusive) return null;
  return toPgDateRange(start, endExclusive);
}

export function parsePgDateRange(pgRange: string | null | undefined): ParsedPgDateRange | null {
  const matches = String(pgRange ?? "").match(ISO_DATE_SCAN_RE);
  if (!matches || matches.length < 2) return null;

  const [start, endExclusive] = matches;
  if (!isIsoDate(start) || !isIsoDate(endExclusive)) return null;

  return { start, endExclusive };
}

export function parsePgDateRangeInclusive(
  pgRange: string | null | undefined,
): ParsedPgDateRangeInclusive | null {
  const parsed = parsePgDateRange(pgRange);
  if (!parsed) return null;

  const endInclusive = addDaysToIsoDate(parsed.endExclusive, -1);
  if (!endInclusive) return null;

  return { ...parsed, endInclusive };
}

export function parsePgDateRangeDates(
  pgRange: string | null | undefined,
): ParsedPgDateRangeDates | null {
  const parsed = parsePgDateRange(pgRange);
  if (!parsed) return null;

  const startDate = isoDateToUtcDate(parsed.start);
  const endExclusiveDate = isoDateToUtcDate(parsed.endExclusive);
  if (!startDate || !endExclusiveDate) return null;

  const nights = Math.max(1, Math.round((endExclusiveDate.getTime() - startDate.getTime()) / MS_PER_DAY));
  return { ...parsed, startDate, endExclusiveDate, nights };
}

export function parsePgDateRangeDatesOrNow(pgRange: string | null | undefined) {
  const parsed = parsePgDateRangeDates(pgRange);
  if (parsed) return parsed;

  const fallback = new Date();
  return {
    start: fallback.toISOString().slice(0, 10),
    endExclusive: fallback.toISOString().slice(0, 10),
    startDate: fallback,
    endExclusiveDate: fallback,
    nights: 1,
  };
}

export function formatIsoDateShortTr(value: string) {
  const date = isoDateToUtcDate(value);
  if (!date) return value;
  return date.toLocaleDateString("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function formatIsoDateLongTr(value: string) {
  const date = isoDateToUtcDate(value);
  if (!date) return value;
  return date.toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function displayPgDateRange(pgRange: string) {
  const parsed = parsePgDateRangeInclusive(pgRange);
  if (!parsed) return pgRange;
  return `${formatIsoDateLongTr(parsed.start)} – ${formatIsoDateLongTr(parsed.endInclusive)}`;
}

export function displayPgDateRangeCheckoutShort(pgRange: string | null | undefined) {
  const parsed = parsePgDateRange(pgRange);
  if (!parsed) return null;
  return `${formatIsoDateShortTr(parsed.start)} → ${formatIsoDateShortTr(parsed.endExclusive)}`;
}
