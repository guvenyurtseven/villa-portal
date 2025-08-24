export function displayPgDateRange(pgRange: string): string {
  // Örn: "[2025-09-09,2025-09-19)" → check-out hariç ⇒ 18'ine kadar
  const m = pgRange.match(/[\[\(]([0-9]{4}-[0-9]{2}-[0-9]{2}),([0-9]{4}-[0-9]{2}-[0-9]{2})[\]\)]/);
  if (!m) return pgRange;

  const start = m[1]; // YYYY-MM-DD
  const endExclusive = m[2]; // YYYY-MM-DD (hariç)
  const endDate = new Date(endExclusive);
  endDate.setDate(endDate.getDate() - 1);

  const toIso = (d: Date) => d.toISOString().slice(0, 10);
  const fmtTr = (s: string) => {
    const [y, mo, da] = s.split("-").map(Number);
    const months = [
      "Ocak",
      "Şubat",
      "Mart",
      "Nisan",
      "Mayıs",
      "Haziran",
      "Temmuz",
      "Ağustos",
      "Eylül",
      "Ekim",
      "Kasım",
      "Aralık",
    ];
    return `${da} ${months[mo - 1]} ${y}`;
  };

  return `${fmtTr(start)} – ${fmtTr(toIso(endDate))}`;
}
