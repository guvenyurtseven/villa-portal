"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import QuickSearch from "@/components/site/QuickSearch";
import VillaCard from "@/components/site/VillaCard";

type Item = {
  id: string;
  name: string;
  capacity: number | null;
  priority?: number | null;
  province?: string | null;
  district?: string | null;
  neighborhood?: string | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  images?: string[];
  primaryPhoto?: string | null;
};

export default function SearchPage() {
  const sp = useSearchParams();
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);

  // URL'den ilk değerleri oku (QuickSearch'e geçiririz; shareable link)
  const initP = sp.getAll("province");
  const initD = sp.getAll("district");
  const initN = sp.getAll("neighborhood");
  const initCheckin = sp.get("checkin") || undefined;
  const initNights = Number(sp.get("nights") || 7);
  const initGuests = Number(sp.get("guests") || 2);

  const qs = useMemo(() => sp.toString(), [sp]);

  useEffect(() => {
    let active = true;
    const run = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search-villas?${qs}`, { cache: "no-store" });
        const json = await res.json();
        if (!active) return;
        setItems(json.items || []);
      } finally {
        if (active) setLoading(false);
      }
    };
    run();
    return () => {
      active = false;
    };
  }, [qs]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-4 space-y-4">
      {/* Filtre barı: aynı QuickSearch; URL paramlarına göre başlar */}
      <QuickSearch
        initialP={initP}
        initialD={initD}
        initialN={initN}
        initialCheckin={initCheckin}
        initialNights={initNights}
        initialGuests={initGuests}
      />

      {/* Sonuçlar */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Arama Sonuçları</h1>
        {!loading && <div className="text-sm text-gray-600">{items.length} sonuç</div>}
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Yükleniyor…</div>
      ) : items.length === 0 ? (
        <div className="text-sm text-gray-500">Kriterlerinize uygun villa bulunamadı.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((v) => (
            <VillaCard
              key={v.id}
              id={v.id}
              name={v.name}
              images={v.images}
              capacity={v.capacity || undefined}
              // Konum satırı (VillaCard bunu gösteriyor)
              province={v.province || undefined}
              district={v.district || undefined}
              neighborhood={v.neighborhood || undefined}
              // Banyo / Yatak odası (VillaCard daha önce bunları aldıysa)
              bedrooms={v.bedrooms ?? undefined}
              bathrooms={v.bathrooms ?? undefined}
            />
          ))}
        </div>
      )}
    </div>
  );
}
