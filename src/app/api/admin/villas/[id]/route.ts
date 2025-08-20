import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { createServiceRoleClient } from "@/lib/supabase/server";

interface Params {
  params: Promise<{ id: string }>;
}

export async function GET(request: Request, { params }: Params) {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = await params;
    const supabase = createServiceRoleClient();

    // Service role ile TÜM villaları görebiliriz (gizli dahil)
    const { data: villa, error } = await supabase
      .from("villas")
      .select(
        `
        *,
        photos:villa_photos(*)
      `,
      )
      .eq("id", id)
      .single();

    if (error || !villa) {
      return NextResponse.json({ error: "Villa not found" }, { status: 404 });
    }

    // Fotoğrafları sırala
    if (villa.photos) {
      villa.photos.sort((a: any, b: any) => a.order_index - b.order_index);
    }

    return NextResponse.json(villa);
  } catch (error) {
    console.error("Villa fetch error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
