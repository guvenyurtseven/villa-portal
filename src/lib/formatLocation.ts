export function formatLocation(
  province?: string | null,
  district?: string | null,
  neighborhood?: string | null,
) {
  return [province, district, neighborhood].filter(Boolean).join(" / ");
}
