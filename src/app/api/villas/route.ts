import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const showHidden = searchParams.get("showHidden") === "true";
    // Not: İstek üzerine burada sunucu tarafında gizli filtre uygulanmıyor.
    // Tüm villalar çekiliyor; gerekirse client tarafında filtrelenecek.

    // Yalnızca ihtiyacımız olan alanları seçelim (performans/şeffaflık için * yerine alan listesi)
    const query = supabase
      .from("villas")
      .select(
        `
        id,
        name,
        capacity,
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
      )
      .order("created_at", { ascending: false });

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const formattedVillas =
      (data || []).map((villa: any) => {
        // Fotoğrafları güvenli şekilde sırala
        const sortedPhotos = (villa.photos || []).slice().sort((a: any, b: any) => {
          const ai = typeof a?.order_index === "number" ? a.order_index : 9999;
          const bi = typeof b?.order_index === "number" ? b.order_index : 9999;
          return ai - bi;
        });

        const primaryPhoto =
          sortedPhotos.find((p: any) => p?.is_primary)?.url ||
          sortedPhotos[0]?.url ||
          "/placeholder.jpg";

        // Kart galerisi için kolay kullanım: sadece URL listesini çıkar
        const images: string[] = sortedPhotos.map((p: any) => p?.url).filter(Boolean);

        return {
          ...villa, // id, name, capacity, is_hidden, created_at, province/district/neighborhood, photos
          primaryPhoto,
          photos: sortedPhotos,
          images, // EK: CardGallery(images) için pratik dizi
        };
      }) || [];

    return NextResponse.json(formattedVillas);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
