// src/app/villalar/page.tsx
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
  images?: string[];
  priority?: number | null;
};

function buildQueryString(sp: SearchParams) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (Array.isArray(v)) v.forEach((x) => x != null && qs.append(k, String(x)));
    else if (v != null) qs.append(k, String(v));
  }
  return qs.toString();
}

// Filtre sayılmayan yardımcı anahtarlar (sayfalama/sıralama gibi)
const NON_FILTER_KEYS = new Set(["page", "pageSize", "sort"]);

function isFilterless(sp: SearchParams) {
  const keys = Object.keys(sp);
  if (keys.length === 0) return true;
  // Sadece sayfalama/sıralama gibi anahtarlar varsa "filtersız" kabul et
  return keys.every((k) => NON_FILTER_KEYS.has(k));
}

async function fetchResults(qs: string, filterless: boolean) {
  const base =
    (process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "") || "http://localhost:3000";
  const url = filterless
    ? `${base}/api/list-villas${qs ? `?${qs}` : ""}`
    : `${base}/api/search-villas${qs ? `?${qs}` : ""}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return { items: [] as SearchResultItem[] };
  return (await res.json()) as { items: SearchResultItem[] };
}

export default async function VillasPage({
  searchParams,
}: {
  // Next.js 15: Promise!
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams; // ← Next 15'te Promise, await edilmeli
  const qs = buildQueryString(sp);
  const filterless = isFilterless(sp);
  const { items } = await fetchResults(qs, filterless);

  return (
    <div className="container mx-auto px-4 py-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Sol: filtreler (Search ile aynı yerleşim) */}
        <aside className="lg:col-span-4 xl:col-span-3">
          <Suspense fallback={<div className="h-40 rounded-lg border animate-pulse" />}>
            <FiltersSidebar />
          </Suspense>
        </aside>

        {/* Sağ: sonuçlar (Search ile aynı grid) */}
        <main className="lg:col-span-8 xl:col-span-9">
          {items.length === 0 ? (
            <div className="rounded-xl border p-6 text-gray-600">
              Gösterilecek villa bulunamadı.
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
