"use client";

import { useEffect, useState } from "react";
import DiscountVillaCard from "./DiscountVillaCard";
import { Percent } from "lucide-react";
import { format } from "date-fns"; // YENİ

type DiscountItem = {
  discount_id: string;
  villa_id: string;
  villa_name: string;
  cover_url?: string | null;
  start_date: string; // YYYY-MM-DD
  end_date: string; // YYYY-MM-DD
  discounted_price: number; // gecelik indirimli
  original_avg_price?: number | null; // indirimsiz ortalama gecelik
  discount_percent?: number | null;
  priority: number;
  capacity?: number;

  province?: string | null;
  district?: string | null;
  neighborhood?: string | null;

  bedroom?: number | null;
  bathroom?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
};

export default function DiscountVillas() {
  const [items, setItems] = useState<DiscountItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/discount-villas?limit=20", { cache: "no-store" });
        if (res.ok) {
          const json = await res.json();

          // ---- Dinamik başlangıç: bugün ile kıs, geçmişi ele ----
          const todayStr = format(new Date(), "yyyy-MM-dd"); // yerel TZ; kart/ekranla tutarlı
          const normalized: DiscountItem[] = (json.items || [])
            .map((it: DiscountItem) => {
              // indirim geçmişte bitmişse listeleme
              if (it.end_date < todayStr) return null;

              // başlangıç bugündense aynı kalsın; geçmişteyse bugüne çek
              const adjStart = it.start_date < todayStr ? todayStr : it.start_date;
              return { ...it, start_date: adjStart };
            })
            .filter(Boolean);

          // ---- Sıralama (mevcut mantık) ----
          const sorted = normalized.sort((a, b) =>
            a.priority === b.priority
              ? a.start_date.localeCompare(b.start_date)
              : a.priority - b.priority,
          );

          setItems(sorted);
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-40" />
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-48 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  if (!items.length) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Percent className="h-5 w-5 text-orange-500" />
          <h2 className="text-xl font-semibold">İndirimli Dönemler</h2>
        </div>
        <div className="text-sm text-gray-500 text-center py-8">
          Şu anda listelenecek indirim bulunmuyor
        </div>
      </div>
    );
  }

  return (
    <div className="w-auto space-y-4">
      <div className="flex items-center gap-2 w-full">
        <Percent className="h-5  text-orange-500" />
        <h2 className="text-xl font-semibold">İndirimli Dönemler</h2>
      </div>

      <div className="grid gap-4">
        {items.map((it) => (
          <DiscountVillaCard
            key={it.discount_id}
            villaId={it.villa_id}
            villaName={it.villa_name}
            photo={it.cover_url || undefined}
            startDate={it.start_date}
            endDate={it.end_date}
            discountedNightly={it.discounted_price}
            originalAvgNightly={it.original_avg_price ?? undefined}
            discountPercent={it.discount_percent ?? undefined}
            capacity={it.capacity}
            province={it.province ?? undefined}
            district={it.district ?? undefined}
            neighborhood={it.neighborhood ?? undefined}
            bedroom={it.bedroom ?? it.bedrooms ?? null}
            bathroom={it.bathroom ?? it.bathrooms ?? null}
          />
        ))}
      </div>
    </div>
  );
}
