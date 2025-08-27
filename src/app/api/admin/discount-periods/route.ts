import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

function bad(msg: string, code = 400) {
  return NextResponse.json({ error: msg }, { status: code });
}

/**
 * GET /api/admin/discount-periods?villa_id=...
 * Belirli villanın indirim dönemlerini listeler (tarihe göre).
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const villa_id = searchParams.get("villa_id");
  if (!villa_id) return bad("villa_id zorunludur");

  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // server-side
  );
  const { data, error } = await supa
    .from("villa_discount_periods")
    .select("*")
    .eq("villa_id", villa_id)
    .order("start_date", { ascending: true });

  if (error) return bad(error.message, 500);
  return NextResponse.json({ periods: data ?? [] });
}

/**
 * POST /api/admin/discount-periods
 * Body: { villa_id, start_date, end_date, nightly_price, priority }
 */
export async function POST(req: Request) {
  const raw = await req.json();
  const villa_id = raw.villa_id ?? raw.villaId;
  const start_date = raw.start_date ?? raw.startDate;
  const end_date = raw.end_date ?? raw.endDate;
  const nightly_price = Number(raw.nightly_price ?? raw.nightlyPrice);
  const priority = Number(raw.priority);

  if (!villa_id || !start_date || !end_date || !nightly_price || !priority) {
    return bad("villa_id, start_date, end_date, nightly_price, priority zorunludur.");
  }

  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  const { data, error } = await supa
    .from("villa_discount_periods")
    .insert([{ villa_id, start_date, end_date, nightly_price, priority }])
    .select("*")
    .single();

  if (error) {
    // 23P01 = exclusion violation (çakışma)
    if ((error as any).code === "23P01") {
      return bad("Seçilen tarih aralığı, mevcut bir indirim dönemiyle çakışıyor.", 409);
    }
    return bad(error.message, 500);
  }

  return NextResponse.json({ period: data }, { status: 201 });
}

/**
 * DELETE /api/admin/discount-periods?id=...
 */
export async function DELETE(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return bad("id zorunludur");

  const supa = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
  const { error } = await supa.from("villa_discount_periods").delete().eq("id", id);
  if (error) return bad(error.message, 500);

  return NextResponse.json({ ok: true }, { status: 200 });
}
