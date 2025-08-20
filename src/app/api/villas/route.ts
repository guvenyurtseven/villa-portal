import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const showHidden = searchParams.get("showHidden") === "true";

    // Tüm villaları çek (gizli veya değil)
    const query = supabase
      .from("villas")
      .select(
        `
        *,
        photos:villa_photos(*)
      `,
      )
      .order("created_at", { ascending: false });

    // showHidden parametresine göre filtreleme YAPMA
    // Tüm villaları çek, filtreleme client tarafında yapılacak

    const { data, error } = await query;

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Veriyi formatla
    const formattedVillas = data?.map((villa) => ({
      ...villa,
      primaryPhoto:
        villa.photos?.find((p: any) => p.is_primary)?.url ||
        villa.photos?.[0]?.url ||
        "/placeholder.jpg",
      photos: villa.photos?.sort((a: any, b: any) => a.order_index - b.order_index) || [],
    }));

    return NextResponse.json(formattedVillas || []);
  } catch (error) {
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
