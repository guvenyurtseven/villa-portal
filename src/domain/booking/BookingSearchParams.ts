import { differenceInCalendarDays, parseISO } from "date-fns";

type SearchParamsReader = {
  get: URLSearchParams["get"];
};

export type ParsedBookingSearchParams = {
  villaId: string;
  villaName: string;
  villaImage: string;
  from: Date;
  to: Date;
  nights: number;
  total: number;
  cleaningFee: number;
  hasCleaningFee: boolean;
  urlDepositForAudit: number | null;
};

function parseDateParam(value: string | null, fallback: Date) {
  if (!value) return fallback;
  const parsed = parseISO(value);
  return Number.isNaN(parsed.getTime()) ? fallback : parsed;
}

function parseIntegerParam(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseOptionalIntegerParam(value: string | null) {
  if (!value) return null;
  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseBookingSearchParams(searchParams: SearchParamsReader) {
  const now = new Date();
  const from = parseDateParam(searchParams.get("from"), now);
  const to = parseDateParam(searchParams.get("to"), from);
  const derivedNights = Math.max(0, differenceInCalendarDays(to, from));
  const urlDepositForAudit = parseOptionalIntegerParam(searchParams.get("deposit"));

  return {
    villaId: searchParams.get("villaId") || "",
    villaName: searchParams.get("villaName") || "",
    villaImage: searchParams.get("villaImage") || "",
    from,
    to,
    nights: Math.max(0, parseIntegerParam(searchParams.get("nights"), derivedNights)),
    total: Math.max(0, parseIntegerParam(searchParams.get("total"), 0)),
    cleaningFee: Math.max(0, parseIntegerParam(searchParams.get("cleaningFee"), 0)),
    hasCleaningFee: searchParams.get("hasCleaningFee") === "true",
    urlDepositForAudit: urlDepositForAudit === null ? null : Math.max(0, urlDepositForAudit),
  } satisfies ParsedBookingSearchParams;
}
