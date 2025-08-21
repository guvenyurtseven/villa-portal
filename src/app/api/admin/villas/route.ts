import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { auth } from "@/lib/auth";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return new NextResponse("Unauthorized", { status: 401 });

  const supabase = getAdminClient();
  const body = await req.json().catch(() => null);
  if (!body || !body.villa || !Array.isArray(body.photos)) {
    return new NextResponse("Bad Request", { status: 400 });
  }

  const v = body.villa as {
    name: string;
    location: string;
    weekly_price: number;
    description: string | null;
    bedrooms: number;
    bathrooms: number;
    has_pool: boolean;
    sea_distance: string | null;
    lat: number | null;
    lng: number | null;
    is_hidden: boolean;
    priority?: number;
  };

  const priority = Math.min(5, Math.max(1, Math.trunc(v.priority ?? 1)));

  const { data: villa, error } = await supabase
    .from("villas")
    .insert({
      name: v.name,
      location: v.location,
      weekly_price: v.weekly_price,
      description: v.description,
      bedrooms: v.bedrooms,
      bathrooms: v.bathrooms,
      has_pool: v.has_pool,
      sea_distance: v.sea_distance,
      lat: v.lat,
      lng: v.lng,
      is_hidden: v.is_hidden,
      priority, // 🔴 yeni
    })
    .select("*")
    .single();

  if (error || !villa) {
    console.error(error);
    return new NextResponse("Insert failed", { status: 500 });
  }

  const photos = body.photos as Array<{ url: string; is_primary: boolean; order_index: number }>;
  if (Array.isArray(photos) && photos.length) {
    const rows = photos.map((p) => ({
      villa_id: villa.id,
      url: p.url,
      is_primary: !!p.is_primary,
      order_index: Number(p.order_index ?? 0),
    }));
    const { error: pErr } = await supabase.from("villa_photos").insert(rows);
    if (pErr) console.error("photo insert warn:", pErr);
  }

  return NextResponse.json({ ok: true, id: villa.id });
}
