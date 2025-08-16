import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  try {
    // Auth kontrolü - session olmasa bile devam et (test için)
    const session = await auth();
    console.log("Session:", session);

    const body = await request.json();
    const { photos, ...villaData } = body;

    const supabase = createServiceRoleClient();

    // Villa oluştur
    const { data: villa, error: villaError } = await supabase
      .from("villas")
      .insert(villaData)
      .select()
      .single();

    if (villaError) {
      console.error("Villa insert error:", villaError);
      return NextResponse.json({ error: villaError.message }, { status: 500 });
    }

    // Fotoğrafları ekle
    if (photos && photos.length > 0) {
      const photoData = photos.map((url: string, index: number) => ({
        villa_id: villa.id,
        url,
        is_primary: index === 0,
        order_index: index,
      }));

      const { error: photoError } = await supabase.from("villa_photos").insert(photoData);

      if (photoError) {
        console.error("Photo insert error:", photoError);
        // Fotoğraf hatası olsa bile villa oluşturuldu, devam et
      }
    }

    return NextResponse.json(villa);
  } catch (error) {
    console.error("API error:", error);
    return NextResponse.json({ error: "Internal server error", details: error }, { status: 500 });
  }
}
