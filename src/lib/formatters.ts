const TRY_CURRENCY_FORMATTER = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
});

const TRY_CURRENCY_NO_FRACTION_FORMATTER = new Intl.NumberFormat("tr-TR", {
  style: "currency",
  currency: "TRY",
  maximumFractionDigits: 0,
});

export function formatTRY(value: number) {
  return TRY_CURRENCY_FORMATTER.format(value);
}

export function formatTRYNoFraction(value: number) {
  return TRY_CURRENCY_NO_FRACTION_FORMATTER.format(value);
}

export function formatTRYOptional(value?: number | null) {
  if (typeof value !== "number" || !Number.isFinite(value)) return undefined;
  return formatTRY(value);
}
