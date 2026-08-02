import { createServiceRoleClient } from "@/lib/supabase/server";
import VillaCard from "./VillaCard";
import { getSortedVillaPhotoUrls } from "@/domain/villas/PhotoSorting";

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
  reference_code: string | null; // referans kodu
};

export const dynamic = "force-dynamic";

export default async function FeaturedVillas() {
  const supabase = createServiceRoleClient();

  const { data: villaRows, error } = await supabase
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
      reference_code,
      villa_photos(villa_id, url, is_primary, order_index)
    `,
    )
    .eq("is_hidden", false)
    .order("priority", { ascending: false })
    .order("id", { ascending: false })
    .limit(10);

  if (error) {
    // İstersen logla ama UI'da sessiz kal
    // console.warn("FeaturedVillas query error:", error);
  }

  const villas = (villaRows ?? []) as VillaRow[];

  const list = villas.map((v) => {
    const sortedUrls = getSortedVillaPhotoUrls(v.villa_photos);

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
      reference_code: v.reference_code ?? undefined,
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
            reference_code={v.reference_code}
          />
        ))}
      </div>
    </section>
  );
}
