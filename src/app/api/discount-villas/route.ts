import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// GET /api/discount-villas?limit=12&from=today
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const limit = Number(searchParams.get("limit") ?? 12);
  const today = searchParams.get("from") ?? new Date().toISOString().slice(0, 10);

  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // server-side
  );

  // Geçmişi ele: bitişi geçmiş olanları gösterme; öncelik ASC (küçük üstte)
  const { data, error } = await supa
    .from("vw_discount_villas")
    .select("*")
    .gte("end_date", today)
    .order("priority", { ascending: true })
    .order("start_date", { ascending: true })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ items: data ?? [] }, { status: 200 });
}
