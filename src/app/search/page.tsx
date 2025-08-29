// src/app/search/page.tsx
import { Suspense } from "react";
import FiltersSidebar from "@/components/site/FiltersSidebar";
import VillaCard from "@/components/site/VillaCard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type SearchParams = Record<string, string | string[] | undefined>;

type SearchResultItem = {
  id: string;
  name: string;
  capacity?: number | null;
  bedrooms?: number | null;
  bathrooms?: number | null;
  province?: string | null;
  district?: string | null;
  neighborhood?: string | null;
  images?: string[]; // CardGallery için
  priority?: number | null;
};

function buildQueryString(sp: SearchParams) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (Array.isArray(v)) {
      v.forEach((x) => x != null && qs.append(k, String(x)));
    } else if (v != null) {
      qs.append(k, String(v));
    }
  }
  return qs.toString();
}

async function fetchResults(qs: string) {
  const base =
    (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "") || "http://localhost:3000";
  const url = qs ? `${base}/api/search-villas?${qs}` : `${base}/api/search-villas`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return { items: [] as SearchResultItem[] };
  return (await res.json()) as { items: SearchResultItem[] };
}

export default async function SearchPage({
  searchParams,
}: {
  // 🔴 ÖNEMLİ: Next 15'te Promise!
  searchParams: Promise<SearchParams>;
}) {
  // ✅ Promise'ı çöz ve sonra kullan
  const sp = await searchParams;
  const qs = buildQueryString(sp);
  const { items } = await fetchResults(qs);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sol: filtreler */}
        <aside className="lg:col-span-4 xl:col-span-3">
          <Suspense fallback={<div className="h-40 rounded-lg border animate-pulse" />}>
            {/* FiltersSidebar client component; kendi state’inden URL’yi günceller */}
            <FiltersSidebar />
          </Suspense>
        </aside>

        {/* Sağ: sonuçlar */}
        <main className="lg:col-span-8 xl:col-span-9">
          {items.length === 0 ? (
            <div className="rounded-xl border p-6 text-gray-600">
              Kriterlerinize uygun villa bulunamadı.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
              {items
                .sort((a, b) => (b?.priority ?? 0) - (a?.priority ?? 0))
                .map((v) => (
                  <VillaCard
                    key={v.id}
                    id={v.id}
                    name={v.name}
                    capacity={v.capacity ?? undefined}
                    images={v.images ?? []}
                    province={v.province ?? undefined}
                    district={v.district ?? undefined}
                    neighborhood={v.neighborhood ?? undefined}
                    bedrooms={v.bedrooms ?? undefined}
                    bathrooms={v.bathrooms ?? undefined}
                  />
                ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
