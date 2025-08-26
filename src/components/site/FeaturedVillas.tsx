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
  priority: number | null;
  is_hidden: boolean | null;
  villa_photos: PhotoRow[];
};

export const dynamic = "force-dynamic";

export default async function FeaturedVillas() {
  const supabase = createServiceRoleClient();

  const { data: villas } = await supabase
    .from("villas")
    .select("id, name,  priority, is_hidden, villa_photos(villa_id, url, is_primary, order_index)")
    .eq("is_hidden", false)
    .order("priority", { ascending: false })
    .order("id", { ascending: false })
    .limit(10);

  const list = (villas ?? []).map((v: VillaRow) => {
    const sorted = (v.villa_photos || [])
      .slice()
      .sort((a, b) => {
        const ap = a.is_primary ? 0 : 1;
        const bp = b.is_primary ? 0 : 1;
        if (ap !== bp) return ap - bp;
        return (a.order_index ?? 999) - (b.order_index ?? 999);
      })
      .map((p) => p.url);
    const images = sorted.slice(0, 8);

    return {
      id: v.id,
      name: v.name,
      images,
      // weeklyPrice kaldırıldı
    };
  });

  if (list.length === 0) return null;

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-semibold">Öne Çıkan Villalar</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {list.map((v) => (
          <VillaCard key={v.id} id={v.id} name={v.name} images={v.images} />
        ))}
      </div>
    </section>
  );
}
