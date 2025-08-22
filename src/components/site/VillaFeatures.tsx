import React from "react";

/** Veritabanındaki boolean kolonlar + görünen etiketler */
const FEATURE_DEFS = [
  { key: "heated_pool", label: "Isıtmalı Havuz" },
  { key: "sheltered_pool", label: "Korunaklı havuz" },
  { key: "tv_satellite", label: "TV - Uydu" },
  { key: "master_bathroom", label: "Ebeveyn Banyosu" },
  { key: "jacuzzi", label: "Jakuzi" },
  { key: "fireplace", label: "Şömine" },
  { key: "children_pool", label: "Çocuk Havuzu" },
  { key: "in_site", label: "Site İçinde" },
  { key: "private_pool", label: "Özel Havuzlu" },
  { key: "playground", label: "Oyun Alanı" },
  { key: "internet", label: "İnternet Bağlantısı" },
  { key: "security", label: "Güvenlik" },
  { key: "sauna", label: "Sauna" },
  { key: "hammam", label: "Hamam" },
  { key: "indoor_pool", label: "Kapalı Havuz" },
  { key: "baby_bed", label: "Bebek Yatağı" },
  { key: "high_chair", label: "Mama Sandalyesi" },
  { key: "foosball", label: "Langırt" },
  { key: "table_tennis", label: "Masa Tenisi" },
  { key: "underfloor_heating", label: "Yerden Isıtma" },
  { key: "generator", label: "Jeneratör" },
  { key: "billiards", label: "Bilardo" },
  { key: "pet_friendly", label: "Evcil Hayvan İzinli" },
] as const;

type FeatureKey = (typeof FEATURE_DEFS)[number]["key"];

export default function VillaFeatures({
  villa,
  className = "",
  title = "Özellikler",
}: {
  /** villa objesinde boolean kolonlar bulunuyor olmalı */
  villa: Partial<Record<FeatureKey, boolean>> | any;
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
