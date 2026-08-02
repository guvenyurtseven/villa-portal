import { FEATURE_DEFS, type FeatureKey } from "@/domain/villas/FeatureCatalog";

export default function VillaFeatures({
  villa,
  className = "",
  title = "Özellikler",
}: {
  /** villa objesinde boolean kolonlar bulunuyor olmalı */
  villa: Partial<Record<FeatureKey, boolean | null | undefined>>;
  className?: string;
  title?: string;
}) {
  // true olan özellikleri filtrele
  const active = FEATURE_DEFS.filter((f) => Boolean(villa?.[f.key]));
  if (active.length === 0) return null;

  return (
    <section className={`rounded-lg border bg-white p-4 ${className}`}>
      <h3 className="mb-3 text-base font-semibold">{title}</h3>
      <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 gap-x-6">
        {active.map((f) => (
          <li key={f.key} className="flex items-center gap-2 text-sm">
            {/* Tik ikonu */}
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              className="text-emerald-600 shrink-0"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
            <span>{f.label}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
