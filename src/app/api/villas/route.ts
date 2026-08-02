import { NextResponse } from "next/server";
import { createClient, createServiceRoleClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/requireAdmin";
import { getSortedVillaPhotoUrls, sortVillaPhotos } from "@/domain/villas/PhotoSorting";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type VillaApiPhotoRow = {
  url: string | null;
  is_primary: boolean | null;
  order_index: number | null;
};

type VillaApiRow = {
  id: string;
  name: string;
  capacity: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  is_hidden: boolean | null;
  created_at: string | null;
  province: string | null;
  district: string | null;
  neighborhood: string | null;
  photos?: VillaApiPhotoRow[] | null;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const showHidden = searchParams.get("showHidden") === "true";

    if (showHidden) {
      const unauthorized = await requireAdmin();
      if (unauthorized) return unauthorized;
    }

    const supabase = showHidden ? createServiceRoleClient() : await createClient();

    let query = supabase.from("villas").select(
      `
        id,
        name,
        capacity,
        bedrooms,
        bathrooms,
        is_hidden,
        created_at,
        province,
        district,
        neighborhood,
        photos:villa_photos (
          url,
          is_primary,
          order_index
        )
      `,
    );

    if (!showHidden) {
      query = query.eq("is_hidden", false);
    }

    const { data, error } = await query.order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching villas:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formatted = ((data ?? []) as VillaApiRow[]).map((villa) => {
      const sortedPhotos = sortVillaPhotos(villa.photos);

      const primaryPhoto =
        sortedPhotos.find((p) => p?.is_primary)?.url ||
        sortedPhotos[0]?.url ||
        "/placeholder.jpg";

      const images = getSortedVillaPhotoUrls(sortedPhotos);

      return {
        ...villa,
        primaryPhoto,
        photos: sortedPhotos,
        images,
      };
    });

    return NextResponse.json(formatted);
  } catch {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
