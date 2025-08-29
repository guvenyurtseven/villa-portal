import { createServiceRoleClient } from "@/lib/supabase/server";
import VillaCard from "./VillaCard";

type PhotoRow = {
  villa_id: string;
  url: string;
  is_primary: boolean | null;
  order_index: number | null;
};

type VillaRow = {
  id: string;
  name: string;
  capacity: number | null;
  priority: number | null;
  is_hidden: boolean | null;
  province: string | null;
  district: string | null;
  neighborhood: string | null;
  villa_photos: PhotoRow[] | null;
  bedrooms: number | null;
  bathrooms: number | null;
};

export const dynamic = "force-dynamic";

export default async function FeaturedVillas() {
  const supabase = createServiceRoleClient();

  const { data: villas } = await supabase
    .from("villas")
    .select(
      `
      id,
      name,
      capacity,
      bedrooms,
      bathrooms,
      priority,
      is_hidden,
      province,
      district,
      neighborhood,
      villa_photos(villa_id, url, is_primary, order_index)
    `,
    )
    .eq("is_hidden", false)
    .order("priority", { ascending: false })
    .order("id", { ascending: false })
    .limit(10);

  const list = (villas ?? []).map((v: VillaRow) => {
    const sortedUrls = (v.villa_photos ?? [])
      .slice()
      .sort((a, b) => {
        const ap = a.is_primary ? 0 : 1;
        const bp = b.is_primary ? 0 : 1;
        if (ap !== bp) return ap - bp;
        const ao = a.order_index ?? 999;
        const bo = b.order_index ?? 999;
        return ao - bo;
      })
      .map((p) => p.url)
      .filter(Boolean) as string[];

    const images = sortedUrls.slice(0, 8);

    return {
      id: v.id,
      name: v.name,
      images,
      capacity: v.capacity ?? undefined,
      province: v.province ?? undefined,
      district: v.district ?? undefined,
      neighborhood: v.neighborhood ?? undefined,
      bedrooms: v.bedrooms ?? undefined,
      bathrooms: v.bathrooms ?? undefined,
    };
  });

  if (list.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Öne Çıkan Villalar</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {list.map((v) => (
          <VillaCard
            key={v.id}
            id={v.id}
            name={v.name}
            capacity={v.capacity}
            images={v.images}
            province={v.province}
            district={v.district}
            neighborhood={v.neighborhood}
            bedrooms={v.bedrooms ?? null}
            bathrooms={v.bathrooms ?? null}
          />
        ))}
      </div>
    </section>
  );
}
