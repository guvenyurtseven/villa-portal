// src/app/search/page.tsx
import { Suspense } from "react";
import FiltersSidebar from "@/components/site/FiltersSidebar";
import VillaCard from "@/components/site/VillaCard";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

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

async function fetchResults(search: string) {
  const url = `${process.env.NEXT_PUBLIC_SITE_URL ?? ""}/api/search-villas${search ? `?${search}` : ""}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return { items: [] as SearchResultItem[] };
  return res.json() as Promise<{ items: SearchResultItem[] }>;
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  // query string’i aynen API’ye ileteceğiz
  const qs =
    typeof window === "undefined"
      ? new URLSearchParams(
          Object.entries(searchParams).flatMap(([k, v]) =>
            Array.isArray(v) ? v.map((x) => [k, x]) : v != null ? [[k, v]] : [],
          ),
        ).toString()
      : window.location.search.slice(1);

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
